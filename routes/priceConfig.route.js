import express from "express";
import { 
  getCurrentPrices, 
  updatePrices, 
  getPriceHistory 
} from "../controllers/priceConfig.controller.js";
import { adminAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/current", getCurrentPrices);

router.put("/update", adminAuth, updatePrices);
router.get("/history", adminAuth, getPriceHistory);

export default router;