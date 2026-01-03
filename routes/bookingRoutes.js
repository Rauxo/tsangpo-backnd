import express from 'express';
import {
  submitBooking,
  getPriceCalculation,
  checkDate,
  getBookings,
  updateBookingStatus,
  getBookingStats
} from '../controllers/mailBookingController.js';

const router = express.Router();

// Public routes for form submissions
router.post('/submit', submitBooking);
router.post('/calculate-price', getPriceCalculation);
router.get('/check-date/:date', checkDate);

// Admin routes
router.get('/admin/bookings', getBookings);
router.put('/admin/bookings/:id/status', updateBookingStatus);
router.get('/admin/stats', getBookingStats);

export default router;