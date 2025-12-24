import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import { registerController } from "../controllers/authController.js";

const router = Router();

router.post("/register", registerController);

export default router;