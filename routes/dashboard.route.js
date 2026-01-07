import express from "express";
import { getDashboardStats, getBookingAnalytics } from "../controllers/dashboard.controller.js";
import { auth, adminAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/stats", auth, adminAuth, getDashboardStats);
router.get("/analytics", auth, adminAuth, getBookingAnalytics);

export default router;