import jwt from "jsonwebtoken";
import UserModel from "../models/user.models.js";

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token required",
        error: true,
        success: false,
      });
    }

    const token = authHeader.split(" ")[1];

    const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (!decode) {
      return res.status(401).json({
        message: "Invalid token",
        error: true,
        success: false,
      });
    }

    req.userId = decode.id;

    req.user = await UserModel.findById(decode.id).select("-password");
    if (!req.user) {
      return res.status(401).json({
        message: "User not found",
        error: true,
        success: false,
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Authentication failed",
      error: true,
      success: false,
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== "ADMIN") {
        return res.status(403).json({
          message: "Access denied. Admin only.",
          error: true,
          success: false,
        });
      }
      next();
    });
  } catch (error) {
    return res.status(500).json({
      message: "Authentication failed",
      error: true,
      success: false,
    });
  }
};

export { auth, adminAuth };
