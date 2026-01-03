import mongoose from 'mongoose';

const blockedDateSchema = new mongoose.Schema({
  date: Date,
  reason: String,
  blockedBy: String,
  blockedAt: { type: Date, default: Date.now }
});

const calendarConfigSchema = new mongoose.Schema({
  // Available dates (only these will be shown)
  availableDates: [Date],
  
  // Blocked dates with reasons
  blockedDates: [blockedDateSchema],
  
  // Settings
  settings: {
    minAdvanceDays: { type: Number, default: 1 },
    maxAdvanceDays: { type: Number, default: 365 },
    allowSameDay: { type: Boolean, default: false }
  },
  
  updatedBy: String,
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

export default mongoose.model('CalendarConfig', calendarConfigSchema);