import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/user.models.js";

// create account
export async function registerController(req, res) {
  try {
    const { fullName, email, contactNumber , password , confirmPassword} = req.body;

    if (!fullName || !confirmPassword || !contactNumber || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
        error: true,
        success: false,
      });
    }

    let user = await userModel.findOne({ email });

    if (user) {
      return res.json({
        message: "User already exists",
        error: true,
        success: false,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new userModel({
      fullName:fullName,
      email: email,
      contactNumber:contactNumber,
      password: hashedPassword,
    });

    await user.save();

    const token = jwt.sign(
      { email: user.email, id: user._id },
      process.env.JWT_SECRET_KEY
    );

    return res.status(200).json({
      success: true,
      error: false,
      message: "User registered successfully",
      token: token,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
}