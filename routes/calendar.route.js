import express from "express";
import { 
  getAvailableDates, 
  updateCalendarSettings, 
  checkDateAvailability 
} from "../controllers/calendar.controller.js";
import { adminAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/available-dates", getAvailableDates);
router.get("/check-availability/:date", checkDateAvailability);

router.put("/update-settings", adminAuth, updateCalendarSettings);

export default router;