import mongoose from "mongoose";

const addonSchema = new mongoose.Schema({
  label: { type: String, required: true },
  price: { type: Number, required: true },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const slotSchema = new mongoose.Schema({
  label: { type: String, required: true },
  time: { type: String, required: true },
  price: { type: Number, required: true },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const priceConfigSchema = new mongoose.Schema({
  basePrice: {
    type: Number,
    required: true,
    default: 8000
  },
  shortCruiseSlots: [slotSchema],
  addons: {
    campsite: addonSchema,
    bonfire: addonSchema,
    conference: addonSchema,
    rooms: addonSchema
  },
  includedGuests: { type: Number, default: 1 },
  extraGuestPrice: { type: Number, default: 300 },
  maxGuests: { type: Number, default: 150 },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, {
  timestamps: true
});

const PriceConfig = mongoose.model("PriceConfig", priceConfigSchema);
export default PriceConfig;