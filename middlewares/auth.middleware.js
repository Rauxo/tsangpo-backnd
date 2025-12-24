import jwt from "jsonwebtoken";
import UserModel from "../models/user.models.js"

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken || req?.headers?.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        message: "Provide Token"
      });
    }
    const decode = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);

    if (!decode) {
      return res.status(401).json({
        message: "unauthorized access",
        error: true,
        success: false
      });
    }

    req.userId = decode.id;
    
    req.user = await UserModel.findById(decode.id).select("-password");
    if (!req.user) {
      return res.status(401).json({
        message: "User not found",
        error: true,
        success: false
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      message: "You have not login",
      error: true,
      success: false
    });
  }
};

export default auth;