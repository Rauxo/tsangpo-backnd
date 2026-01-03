import express from 'express';
import {
  submitBooking,
  getPriceCalculation,
  checkDate,
  getBookings,
  updateBookingStatus,
  getBookingStats,
  // New functions for price and calendar config
  getPriceConfig,
  updatePriceConfig,
  getCalendarConfig,
  updateCalendarConfig,
  addAvailableDate,
  removeAvailableDate,
  addBlockedDate,
  removeBlockedDate
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

// Price configuration routes
router.get('/admin/prices', getPriceConfig);
router.put('/admin/prices', updatePriceConfig);

// Calendar configuration routes
router.get('/admin/calendar', getCalendarConfig);
router.put('/admin/calendar', updateCalendarConfig);
router.post('/admin/calendar/available', addAvailableDate);
router.delete('/admin/calendar/available/:index', removeAvailableDate);
router.post('/admin/calendar/blocked', addBlockedDate);
router.delete('/admin/calendar/blocked/:index', removeBlockedDate);

export default router;