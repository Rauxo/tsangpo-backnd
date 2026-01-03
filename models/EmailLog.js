const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  to: String,
  subject: String,
  bookingId: mongoose.Schema.Types.ObjectId,
  formType: String,
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'pending'
  },
  error: String,
  sentAt: Date
}, { timestamps: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);