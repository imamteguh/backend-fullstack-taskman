import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Verification from "../models/verification.js";
import { sendEmail } from "../libs/send-email.js";
import aj from "../libs/arcjet.js";

const registerUser = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Deduct 5 tokens from the bucket
    const decision = await aj.protect(req, { email });
    if (decision.isDenied()) {
      return res.status(403).json({
        message: "Invalid email address",
      });
    }

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    // salt password
    const salt = await bcrypt.genSalt(10);

    // hash password
    const hashedPassword = await bcrypt.hash(password, salt);

    // create new user
    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
    });

    const verificationToken = jwt.sign(
      { userId: newUser._id, purpose: "email-verification" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // create verification token
    await Verification.create({
      userId: newUser._id,
      token: verificationToken,
      expiresAt: Date.now() + 60 * 60 * 1000,
    });

    // send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailBody = `Please click the following link to verify your email: ${verificationUrl}`;
    const emailSubject = "Email Verification";

    const isEmailSent = await sendEmail(newUser.email, emailSubject, emailBody);
    if (!isEmailSent) {
      return res.status(400).json({
        message: "Email verification failed, please try again",
      });
    }

    res.status(201).json({
      message: "User registered, please verify your email",
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: "Internal Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    // verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, purpose } = payload;

    // check if purpose is email-verification
    if (purpose !== "email-verification") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // check if verification token exists
    const verificationToken = await Verification.findOne({
      userId,
      token,
    });

    if (!verificationToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // check if token has expired
    if (verificationToken.expiresAt < new Date()) {
      return res.status(401).json({ message: "Token expired" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // check if user is already verified
    if (user.isEmailVerified) {
      return res.status(401).json({ message: "Email already verified" });
    }

    // update user isEmailVerified to true
    user.isEmailVerified = true;
    await user.save();

    // delete verification token
    await Verification.findByIdAndDelete(verificationToken._id);

    res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({
      message: "Internal Server Error",
    });
  }
};

export { registerUser, loginUser, verifyEmail };
