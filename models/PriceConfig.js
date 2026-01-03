import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  label: String,
  time: String,
  price: Number,
  enabled: { type: Boolean, default: true }
});

const addonSchema = new mongoose.Schema({
  label: String,
  price: Number,
  enabled: { type: Boolean, default: true }
});

const priceConfigSchema = new mongoose.Schema({
  // Basic pricing
  basePrice: { type: Number, default: 8000 },
  includedGuests: { type: Number, default: 1 },
  extraGuestPrice: { type: Number, default: 300 },
  maxGuests: { type: Number, default: 150 },
  
  // Short cruise slots pricing
  shortCruiseSlots: [slotSchema],
  
  // Addons pricing
  addons: {
    type: Map,
    of: addonSchema,
    default: {}
  },
  
  // Form-specific pricing (for your 5 forms)
  formSpecificPricing: {
    tsangpoImperialPrivate: {
      basePrice: { type: Number, default: 12000 },
      description: "Tsangpo Imperial Private Booking"
    },
    publicCharterLong: {
      basePrice: { type: Number, default: 15000 },
      description: "Public Charter Long Cruise"
    },
    privateCharter: {
      basePrice: { type: Number, default: 10000 },
      shortCruisePrice: { type: Number, default: 6000 },
      description: "Private Charter"
    },
    overnightCruise: {
      basePrice: { type: Number, default: 25000 },
      perCabinPrice: { type: Number, default: 5000 },
      description: "Overnight Cruise"
    },
    privateCruiseBooking: {
      basePrice: { type: Number, default: 18000 },
      description: "Private Cruise Booking"
    }
  },
  
  updatedBy: String,
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.model('PriceConfig', priceConfigSchema);