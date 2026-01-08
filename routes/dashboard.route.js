import express from "express";
import { getDashboardStats, getBookingAnalytics, getGuestStatistics, getSeatOccupancyReport } from "../controllers/dashboard.controller.js";
import { auth, adminAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/stats", auth, adminAuth, getDashboardStats);
router.get("/analytics", auth, adminAuth, getBookingAnalytics);
router.get("/guest-stats", getGuestStatistics); // Add this
router.get("/seat-occupancy", getSeatOccupancyReport); // Add this

export default router;