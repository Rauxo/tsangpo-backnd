const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  formType: {
    type: String,
    enum: [
      'TsangpoImperialPrivateBooking',
      'PublicCharterLongCruiseEnquiry', 
      'PrivateCharterEnquiry',
      'OvernightCruiseEnquiry',
      'PrivateCruiseBookingForm'
    ],
    required: true
  },
  // Common fields for all forms
  date: Date,
  name: String,
  phone: String,
  email: String,
  guests: Number,
  message: String,
  
  // Form-specific fields
  cruiseType: String,
  slot: String,
  destination: String,
  nights: String,
  checkIn: String,
  cabins: Number,
  cruise: String,
  
  // Price calculation
  basePrice: Number,
  extraGuestPrice: Number,
  totalPrice: Number,
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'contacted', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  
  metadata: {
    ipAddress: String,
    userAgent: String,
    submittedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);