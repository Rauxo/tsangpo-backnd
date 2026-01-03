import mongoose from 'mongoose';

const mailBookingSchema = new mongoose.Schema({
  // Form type identification
  formType: {
    type: String,
    required: true,
    enum: [
      'tsangpo-imperial-private',
      'public-charter-long',
      'private-charter',
      'overnight-cruise',
      'private-cruise-booking'
    ]
  },
  
  // Common fields across all forms
  date: { type: Date, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  guests: { type: Number, required: true },
  message: String,
  
  // Form-specific optional fields
  cruiseType: String,
  slot: String,
  destination: String,
  nights: String,
  checkIn: String,
  cabins: Number,
  cruise: String,
  
  // Dynamic price calculation
  priceCalculation: {
    basePrice: Number,
    extraGuestPrice: Number,
    perGuestPrice: Number,
    totalPrice: Number,
    priceBreakdown: {
      baseAmount: Number,
      extraGuests: Number,
      extraGuestsAmount: Number,
      slotPrice: Number,
      cabinPrice: Number
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'contacted', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  
  // Admin notes
  adminNotes: String,
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.model('MailBooking', mailBookingSchema);