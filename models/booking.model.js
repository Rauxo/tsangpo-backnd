import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  bookingType: {
    type: String,
    enum: ["SHORT_CRUISE", "LONG_CRUISE"],
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  slot: {
    label: String,
    time: String,
    price: Number
  },
  guests: {
    type: Number,
    min: 1,
    max: 150
  },
    adults: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  
  children: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  addons: [{
    name: String,
    price: Number
  }],
  pricingBreakdown: {
    basePrice: Number,
    slotPrice: Number,
    addonsTotal: Number,
    extraGuestsPrice: Number,
    totalAmount: Number
  },
  specialRequest: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  paymentStatus: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING"
  },
  bookingStatus: {
    type: String,
    enum: ["CONFIRMED", "CANCELLED", "COMPLETED"],
    default: "CONFIRMED"
  }
}, {
  timestamps: true
});

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;