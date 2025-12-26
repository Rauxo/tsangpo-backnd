import { Router } from "express";
import { auth, adminAuth } from "../middlewares/auth.middleware.js";
import {
    loginController,
    registerController,
    getCurrentUser
} from "../controllers/authController.js";

const router = Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.get("/profile", auth, getCurrentUser);

export default router;