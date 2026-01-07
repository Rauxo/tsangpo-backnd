import Booking from "../models/booking.model.js";
import MailBooking from "../models/MailBooking.js";
import Gallery from "../models/Gallery.js";
import Story from "../models/story.model.js";
import PriceConfig from "../models/PriceConfig.js";
import CalendarConfig from "../models/CalendarConfig.js";

// Get dashboard statistics - CORRECTED VERSION
export const getDashboardStats = async (req, res) => {
  try {
    // Get current date for calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = new Date(today);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    console.log("Today's date range for query:", todayStart, "to", todayEnd);
    
    // FIX 1: Use createdAt for "today's bookings"
    const todaysBookings = await Booking.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },  // CHANGED
      bookingStatus: 'CONFIRMED'
    });
    
    const todaysMailBookings = await MailBooking.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd },  // CHANGED
      status: 'confirmed'
    });
    
    console.log("Today's bookings count:", {
      bookings: todaysBookings,
      mailBookings: todaysMailBookings
    });
    
    // FIX 2: Calculate guests for today - use createdAt
    const todaysBookingGuests = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart, $lte: todayEnd },  // CHANGED
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
          createdAt: { $gte: todayStart, $lte: todayEnd },  // CHANGED
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
    
    // FIX 3: Get capacity
    const priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });
    const totalCapacity = priceConfig?.maxGuests || 160;
    const availableSeats = Math.max(0, totalCapacity - todaysTotalGuests);
    
    console.log("Capacity calculation:", {
      totalCapacity,
      todaysTotalGuests,
      availableSeats
    });
    
    // FIX 4: Get recent activity with correct user field
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'fullName email');  // CHANGED: 'name' → 'fullName'
    
    const recentMailBookings = await MailBooking.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    // FIX 5: Map activity with correct field names
    const recentActivity = [
      ...recentBookings.map(b => ({
        type: 'booking',
        id: b._id,
        name: b.user?.fullName || b.user?.email || 'Guest',  // CHANGED
        email: b.user?.email || 'N/A',
        date: b.date,
        guests: b.guests,
        status: b.bookingStatus,
        createdAt: b.createdAt
      })),
      ...recentMailBookings.map(mb => ({
        type: 'enquiry',
        id: mb._id,
        name: mb.name || mb.email || 'Guest',  // Use email if name missing
        email: mb.email || 'N/A',
        date: mb.date,
        guests: mb.guests,
        status: mb.status,
        createdAt: mb.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
     .slice(0, 5);
    
    // FIX 6: Count private/group with correct enum values
    const privateBookings = await Booking.countDocuments({ 
      bookingType: { $in: ['PRIVATE', 'SHORT_CRUISE', 'LONG_CRUISE'] } 
    });
    
    const groupBookings = await Booking.countDocuments({ 
      bookingType: 'GROUP' 
    });
    
    const privateMailBookings = await MailBooking.countDocuments({
      formType: { 
        $in: ['TsangpoImperialPrivateBooking', 'PrivateCharterEnquiry'] 
      }
    });
    
    const groupMailBookings = await MailBooking.countDocuments({
      formType: { 
        $in: ['PublicCharterLongCruiseEnquiry'] 
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalBookings: await Booking.countDocuments() + await MailBooking.countDocuments(),
          privateCruises: privateBookings + privateMailBookings,
          groupCruises: groupBookings + groupMailBookings,
          availableSeats,
          galleryImages: await Gallery.countDocuments(),
          stories: await Story.countDocuments({ isPublished: true }),
          totalCapacity
        },
        todayStats: {
          bookings: todaysBookings + todaysMailBookings,
          guests: todaysTotalGuests,
          availableSeats
        },
        recentActivity,
        debug: {  // Add debug info
          queryDateRange: { todayStart, todayEnd },
          todaysBookings,
          todaysMailBookings,
          todaysTotalGuests
        }
      }
    });
    
  } catch (error) {
    console.error("Dashboard error details:", {
      message: error.message,
      stack: error.stack
    });
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