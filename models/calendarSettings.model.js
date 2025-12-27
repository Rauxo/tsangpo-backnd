import mongoose from "mongoose";

const calendarSettingsSchema = new mongoose.Schema({
  availableDates: [{
    date: { type: Date, required: true },
    available: { type: Boolean, default: true }
  }],
  blockedDates: [{
    date: Date,
    reason: String
  }],
  dailyBookings: {
  type: [
    {
      date: Date,
      count: Number,
    },
  ],
  default: [],
},

  bookedDates: [{
    date: Date,
    bookingCount: { type: Number, default: 0 }
  }],
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, {
  timestamps: true
});

const CalendarSettings = mongoose.model("CalendarSettings", calendarSettingsSchema);
export default CalendarSettings;