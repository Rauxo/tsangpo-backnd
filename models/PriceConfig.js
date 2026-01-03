import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  label: { type: String },
  time: { type: String },
  price: { type: Number },
  enabled: { type: Boolean, default: true }
});

const addonSchema = new mongoose.Schema({
  label: { type: String },
  price: { type: Number },
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

  // Form-specific pricing
  formSpecificPricing: {
    tsangpoImperialPrivate: {
      basePrice: { type: Number, default: 12000 },
      description: {
        type: String,
        default: "Tsangpo Imperial Private Booking"
      }
    },
    publicCharterLong: {
      basePrice: { type: Number, default: 15000 },
      description: {
        type: String,
        default: "Public Charter Long Cruise"
      }
    },
    privateCharter: {
      basePrice: { type: Number, default: 10000 },
      shortCruisePrice: { type: Number, default: 6000 },
      description: {
        type: String,
        default: "Private Charter"
      }
    },
    overnightCruise: {
      basePrice: { type: Number, default: 25000 },
      perCabinPrice: { type: Number, default: 5000 },
      description: {
        type: String,
        default: "Overnight Cruise"
      }
    },
    privateCruiseBooking: {
      basePrice: { type: Number, default: 18000 },
      description: {
        type: String,
        default: "Private Cruise Booking"
      }
    }
  },

  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.models.PriceConfig ||
  mongoose.model('PriceConfig', priceConfigSchema);

