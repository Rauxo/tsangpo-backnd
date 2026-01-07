import Booking from "../models/booking.model.js";
import MailBooking from "../models/MailBooking.js";
import Gallery from "../models/Gallery.js";
import Story from "../models/story.model.js";
import PriceConfig from "../models/PriceConfig.js";
import CalendarConfig from "../models/CalendarConfig.js";

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get current date for calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate total bookings from both booking systems
    const totalBookingsCount = await Booking.countDocuments();
    const mailBookingsCount = await MailBooking.countDocuments();
    const totalBookings = totalBookingsCount + mailBookingsCount;
    
    // Get private cruises count (from both systems)
    const privateBookings = await Booking.countDocuments({ 
      bookingType: 'private' 
    });
    const privateMailBookings = await MailBooking.countDocuments({
      formType: { 
        $in: ['tsangpo-imperial-private', 'private-charter', 'private-cruise-booking'] 
      }
    });
    const privateCruises = privateBookings + privateMailBookings;
    
    // Get group cruises count (from both systems)
    const groupBookings = await Booking.countDocuments({ 
      bookingType: 'group' 
    });
    const groupMailBookings = await MailBooking.countDocuments({
      formType: { 
        $in: ['public-charter-long'] 
      }
    });
    const groupCruises = groupBookings + groupMailBookings;
    
    // Get gallery images count
    const galleryImages = await Gallery.countDocuments();
    
    // Get stories count
    const stories = await Story.countDocuments({ isPublished: true });
    
    // Calculate available seats
    const priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });
    const totalCapacity = priceConfig?.maxGuests || 160; // Default 160 if not configured
    
    // Get today's confirmed bookings
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const todaysBookings = await Booking.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
      bookingStatus: 'CONFIRMED'
    });
    
    const todaysMailBookings = await MailBooking.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
      status: 'confirmed'
    });
    
    // Calculate booked seats for today
    const todaysBookingGuests = await Booking.aggregate([
      {
        $match: {
          date: { $gte: todayStart, $lte: todayEnd },
          bookingStatus: 'CONFIRMED'
        }
      },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: "$guests" }
        }
      }
    ]);
    
    const todaysMailBookingGuests = await MailBooking.aggregate([
      {
        $match: {
          date: { $gte: todayStart, $lte: todayEnd },
          status: 'confirmed'
        }
      },
      {
        $group: {
          _id: null,
          totalGuests: { $sum: "$guests" }
        }
      }
    ]);
    
    const todaysTotalGuests = 
      (todaysBookingGuests[0]?.totalGuests || 0) + 
      (todaysMailBookingGuests[0]?.totalGuests || 0);
    
    const availableSeats = totalCapacity - todaysTotalGuests;
    
    // Get recent activity
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email');
    
    const recentMailBookings = await MailBooking.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    const recentActivity = [
      ...recentBookings.map(b => ({
        type: 'booking',
        id: b._id,
        name: b.user?.name || 'Guest',
        date: b.date,
        status: b.bookingStatus,
        createdAt: b.createdAt
      })),
      ...recentMailBookings.map(mb => ({
        type: 'enquiry',
        id: mb._id,
        name: mb.name,
        date: mb.date,
        status: mb.status,
        createdAt: mb.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
     .slice(0, 5);
    
    // Get monthly statistics for chart
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Monthly bookings data
    const monthlyBookings = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lt: new Date(currentYear, currentMonth + 1, 1)
          }
        }
      },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBookings,
          privateCruises,
          groupCruises,
          availableSeats: Math.max(0, availableSeats),
          galleryImages,
          stories,
          totalCapacity
        },
        recentActivity,
        monthlyData: monthlyBookings,
        todayStats: {
          bookings: todaysBookings + todaysMailBookings,
          guests: todaysTotalGuests,
          availableSeats: Math.max(0, availableSeats)
        }
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message
    });
  }
};

// Get booking analytics
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
    
    // Get bookings by type
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
          totalRevenue: { $sum: "$priceCalculation.totalPrice" }
        }
      }
    ]);
    
    // Get daily booking trend
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
          revenue: { $sum: "$pricingBreakdown.totalAmount" }
        }
      },
      {
        $sort: { "_id": 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        bookingsByType,
        mailBookingsByType,
        dailyTrend,
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