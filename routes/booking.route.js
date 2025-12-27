import express from "express";
import { 
  createBooking, 
  verifyPayment, 
  getUserBookings, 
  getAllBookings 
} from "../controllers/booking.controller.js";
import { auth, adminAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/create", auth, createBooking);
router.post("/verify-payment", auth, verifyPayment);
router.get("/my-bookings", auth, getUserBookings);

router.get("/all", adminAuth, getAllBookings);

export default router;