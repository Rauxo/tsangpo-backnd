import Booking from "../models/booking.model.js";
import PriceConfig from "../models/priceConfig.model.js";
import CalendarSettings from "../models/calendarSettings.model.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createBooking = async (req, res) => {
  try {
    const { 
      bookingType, 
      date, 
      slot, 
      adults = 1,
      children = 0,
      addons, 
      specialRequest 
    } = req.body;
    
    const userId = req.userId;
    // const totalGuests = guests || (adults + children);
    const totalGuests = adults + children;

    const calendarSettings = await CalendarSettings.findOne().sort({ createdAt: -1 });
    const bookingDate = new Date(date);
    
    const dailyBooking = calendarSettings?.dailyBookings?.find(
      db => new Date(db.date).toDateString() === bookingDate.toDateString()
    );
    
    if (dailyBooking && dailyBooking.count >= calendarSettings.maxBookingsPerDay) {
      return res.status(400).json({
        success: false,
        message: "Selected date is fully booked"
      });
    }
    
    const priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });
    if (!priceConfig) {
      return res.status(500).json({
        success: false,
        message: "Price configuration not found"
      });
    }
    
    const adultPrice = slot?.adultPrice || slot?.price || 0;
    const childPrice = slot?.childPrice || 0;
    const slotPrice = (adults * adultPrice) + (children * childPrice);
    
    let addonsTotal = 0;
    const addonDetails = [];
    if (addons && addons.length > 0) {
      addons.forEach(addonKey => {
        if (priceConfig.addons[addonKey]) {
          addonsTotal += priceConfig.addons[addonKey];
          addonDetails.push({
            name: addonKey,
            price: priceConfig.addons[addonKey]
          });
        }
      });
    }
    
    const totalAmount = slotPrice + addonsTotal;
    
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        bookingType,
        date
      }
    });
    
    const booking = await Booking.create({
      user: userId,
      bookingType,
      date: bookingDate,
      slot: {
        ...slot,
        adultPrice: adultPrice,
        childPrice: childPrice
      },
      adults,
      children,
      totalGuests,
      addons: addonDetails,
      specialRequest,
      pricingBreakdown: {
        adults,
        children,
        adultPrice,
        childPrice,
        slotPrice,
        addonsTotal,
        totalAmount
      },
      razorpayOrderId: razorpayOrder.id,
      paymentStatus: "PENDING"
    });
    
    res.status(200).json({
      success: true,
      message: "Booking created successfully",
      data: {
        bookingId: booking._id,
        orderId: razorpayOrder.id,
        amount: totalAmount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating booking",
      error: error.message
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentStatus: "SUCCESS",
        bookingStatus: "CONFIRMED",
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const calendarSettings = await CalendarSettings.findOne().sort({
      createdAt: -1,
    });

    if (calendarSettings) {
      if (!Array.isArray(calendarSettings.dailyBookings)) {
        calendarSettings.dailyBookings = [];
      }

      const bookingDate = new Date(booking.date).toDateString();

      const index = calendarSettings.dailyBookings.findIndex(
        (db) => new Date(db.date).toDateString() === bookingDate
      );

      if (index !== -1) {
        calendarSettings.dailyBookings[index].count += 1;
      } else {
        calendarSettings.dailyBookings.push({
          date: booking.date,
          count: 1,
        });
      }

      await calendarSettings.save();
    }

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: error.message,
    });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .populate("user", "name email");

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching bookings",
      error: error.message,
    });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email phone");

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching all bookings",
      error: error.message,
    });
  }
};
