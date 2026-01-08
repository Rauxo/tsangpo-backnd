import Booking from "../models/booking.model.js";
import MailBooking from "../models/MailBooking.js";
import Gallery from "../models/Gallery.js";
import Story from "../models/story.model.js";
import PriceConfig from "../models/PriceConfig.js";
import CalendarConfig from "../models/CalendarConfig.js";

// Get dashboard statistics - UPDATED WITH ADULT/CHILD STATS
export const getDashboardStats = async (req, res) => {
  try {
    // Get current date for calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    console.log("Today's date range for query:", todayStart, "to", todayEnd);
    
    // Get today's confirmed bookings
    const todaysBookings = await Booking.find({
      date: { 
        $gte: todayStart, 
        $lte: todayEnd 
      },
      bookingStatus: 'CONFIRMED'
    });
    
    const todaysMailBookings = await MailBooking.find({
      date: { 
        $gte: todayStart, 
        $lte: todayEnd 
      },
      status: 'confirmed'
    });
    
    // Calculate today's adult/child counts
    let todaysAdults = 0;
    let todaysChildren = 0;
    let todaysTotalGuests = 0;
    
    // For Booking model (calculate from adults + children)
    todaysBookings.forEach(booking => {
      todaysAdults += booking.adults || 0;
      todaysChildren += booking.children || 0;
      todaysTotalGuests += (booking.adults || 0) + (booking.children || 0);
    });
    
    // For MailBooking model
    todaysMailBookings.forEach(booking => {
      const guests = booking.guests || 0;
      todaysTotalGuests += guests;
      todaysAdults += guests; // Assume all are adults for MailBooking
    });
    
    // Get capacity
    const priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });
    const calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    
    // Get max capacity
    const totalCapacity = calendarConfig?.maxBookingsPerDay || priceConfig?.maxGuests || 160;
    
    // Calculate available seats based on adult + child counts
    const availableSeats = Math.max(0, totalCapacity - todaysTotalGuests);
    
    console.log("Capacity calculation:", {
      totalCapacity,
      todaysAdults,
      todaysChildren,
      todaysTotalGuests,
      availableSeats
    });
    
    // Get recent activity
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'fullName email');
    
    const recentMailBookings = await MailBooking.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Map activity
    const recentActivity = [
      ...recentBookings.map(b => ({
        type: 'booking',
        id: b._id,
        name: b.user?.fullName || b.user?.email || 'Guest',
        email: b.user?.email || 'N/A',
        date: b.date,
        adults: b.adults || 0,
        children: b.children || 0,
        guests: (b.adults || 0) + (b.children || 0),
        status: b.bookingStatus,
        createdAt: b.createdAt
      })),
      ...recentMailBookings.map(mb => ({
        type: 'enquiry',
        id: mb._id,
        name: mb.name || mb.email || 'Guest',
        email: mb.email || 'N/A',
        date: mb.date,
        adults: mb.guests || 0,
        children: 0,
        guests: mb.guests || 0,
        status: mb.status,
        createdAt: mb.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
     .slice(0, 5);
    
    // Get total adult/child counts from ALL bookings
    const allBookings = await Booking.find({ bookingStatus: 'CONFIRMED' });
    const allMailBookings = await MailBooking.find({ status: 'confirmed' });
    
    let totalAdults = 0;
    let totalChildren = 0;
    let totalGuests = 0;
    
    // For Booking model
    allBookings.forEach(booking => {
      totalAdults += booking.adults || 0;
      totalChildren += booking.children || 0;
      totalGuests += (booking.adults || 0) + (booking.children || 0);
    });
    
    // For MailBooking model
    allMailBookings.forEach(booking => {
      const guests = booking.guests || 0;
      totalGuests += guests;
      totalAdults += guests; // Assume all are adults
    });
    
    // Calculate percentages
    const adultPercentage = totalGuests > 0 ? Math.round((totalAdults / totalGuests) * 100) : 0;
    const childPercentage = totalGuests > 0 ? Math.round((totalChildren / totalGuests) * 100) : 0;
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBookings: allBookings.length + allMailBookings.length,
          totalAdults,
          totalChildren,
          totalGuests,
          availableSeats,
          galleryImages: await Gallery.countDocuments(),
          stories: await Story.countDocuments({ isPublished: true }),
          totalCapacity,
          adultPercentage,
          childPercentage
        },
        todayStats: {
          bookings: todaysBookings.length + todaysMailBookings.length,
          guests: todaysTotalGuests,
          adults: todaysAdults,
          children: todaysChildren,
          availableSeats
        },
        recentActivity
      }
    });
    
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message
    });
  }
};

// Get booking analytics - UPDATED WITH ADULT/CHILD DATA
export const getBookingAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const today = new Date();
    
    let startDate;
    switch(period) {
      case 'week':
        startDate = new Date(today.setDate(today.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
        break;
      case 'year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    }
    
    // Get bookings with adult/child breakdown
    const bookingsByType = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$bookingType",
          count: { $sum: 1 },
          totalAdults: { $sum: "$adults" },
          totalChildren: { $sum: "$children" },
          totalGuests: { $sum: "$guests" },
          totalRevenue: { $sum: "$pricingBreakdown.totalAmount" }
        }
      }
    ]);
    
    // Get mail bookings by form type
    const mailBookingsByType = await MailBooking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$formType",
          count: { $sum: 1 },
          totalGuests: { $sum: "$guests" },
          totalRevenue: { $sum: "$priceCalculation.totalPrice" }
        }
      }
    ]);
    
    // Get daily booking trend with adult/child breakdown
    const dailyTrend = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          adults: { $sum: "$adults" },
          children: { $sum: "$children" },
          guests: { $sum: "$guests" },
          revenue: { $sum: "$pricingBreakdown.totalAmount" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    // Get adult/child distribution by cruise type
    const distributionByCruise = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$slot.label",
          adults: { $sum: "$adults" },
          children: { $sum: "$children" },
          total: { $sum: 1 }
        }
      }
    ]);
    
    // Get top booking dates
    const topBookingDates = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          bookings: { $sum: 1 },
          adults: { $sum: "$adults" },
          children: { $sum: "$children" }
        }
      },
      {
        $sort: { bookings: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        bookingsByType,
        mailBookingsByType,
        dailyTrend,
        distributionByCruise,
        topBookingDates,
        period
      }
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching analytics",
      error: error.message
    });
  }
};

// NEW: Get detailed guest statistics
export const getGuestStatistics = async (req, res) => {
  try {
    // Get adult/child statistics by cruise type
    const guestStatsByCruise = await Booking.aggregate([
      {
        $match: {
          bookingStatus: 'CONFIRMED'
        }
      },
      {
        $group: {
          _id: "$slot.label",
          totalBookings: { $sum: 1 },
          totalAdults: { $sum: "$adults" },
          totalChildren: { $sum: "$children" },
          totalGuests: { $sum: "$guests" },
          averageAdultsPerBooking: { $avg: "$adults" },
          averageChildrenPerBooking: { $avg: "$children" }
        }
      },
      {
        $sort: { totalGuests: -1 }
      }
    ]);
    
    // Get monthly trend of adult/child bookings
    const monthlyTrend = await Booking.aggregate([
      {
        $match: {
          bookingStatus: 'CONFIRMED',
          createdAt: { $gte: new Date(new Date().getFullYear(), 0, 1) }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          bookings: { $sum: 1 },
          adults: { $sum: "$adults" },
          children: { $sum: "$children" },
          revenue: { $sum: "$pricingBreakdown.totalAmount" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    // Get booking size distribution
    const bookingSizeDistribution = await Booking.aggregate([
      {
        $match: {
          bookingStatus: 'CONFIRMED'
        }
      },
      {
        $bucket: {
          groupBy: "$guests",
          boundaries: [1, 5, 10, 20, 50, 100, 150],
          default: "150+",
          output: {
            count: { $sum: 1 },
            totalAdults: { $sum: "$adults" },
            totalChildren: { $sum: "$children" }
          }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        guestStatsByCruise,
        monthlyTrend,
        bookingSizeDistribution
      }
    });
  } catch (error) {
    console.error("Guest statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching guest statistics",
      error: error.message
    });
  }
};

// NEW: Get seat occupancy report
export const getSeatOccupancyReport = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get daily seat occupancy
    const dailyOccupancy = await Booking.aggregate([
      {
        $match: {
          bookingStatus: 'CONFIRMED',
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          bookings: { $sum: 1 },
          adults: { $sum: "$adults" },
          children: { $sum: "$children" },
          guests: { $sum: "$guests" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    // Get capacity from calendar
    const calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    const priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });
    const capacity = calendarConfig?.maxBookingsPerDay || priceConfig?.maxGuests || 160;
    
    // Calculate occupancy percentages
    const occupancyWithPercentage = dailyOccupancy.map(day => ({
      ...day,
      occupancy: Math.round((day.guests / capacity) * 100),
      date: day._id
    }));
    
    // Calculate overall statistics
    const overallStats = dailyOccupancy.reduce((acc, day) => {
      acc.totalAdults += day.adults;
      acc.totalChildren += day.children;
      acc.totalGuests += day.guests;
      acc.totalBookings += day.bookings;
      return acc;
    }, { totalAdults: 0, totalChildren: 0, totalGuests: 0, totalBookings: 0 });
    
    // Calculate average daily occupancy
    const averageOccupancy = dailyOccupancy.length > 0 
      ? Math.round((overallStats.totalGuests / (dailyOccupancy.length * capacity)) * 100)
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        dailyOccupancy: occupancyWithPercentage,
        overallStats,
        capacity,
        averageOccupancy,
        period: {
          startDate,
          endDate,
          days: parseInt(days)
        }
      }
    });
  } catch (error) {
    console.error("Seat occupancy error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching seat occupancy report",
      error: error.message
    });
  }
};