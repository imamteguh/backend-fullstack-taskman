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
      return res.status(500).json({
        message: "Email verification failed, please try again",
      });
    }

    res.status(201).json({
      message: "User registered, please verify your email",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isEmailVerified) {
      const existingVerificationToken = await Verification.findOne({
        userId: user._id,
      });

      if (
        existingVerificationToken &&
        existingVerificationToken.expiresAt > new Date()
      ) {
        return res
          .status(400)
          .json({ message: "Email not verified, please check your email" });
      } else {
        await Verification.findByIdAndDelete(existingVerificationToken._id);

        const verificationToken = jwt.sign(
          { userId: user._id, purpose: "email-verification" },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
        );

        await Verification.create({
          userId: user._id,
          token: verificationToken,
          expiresAt: Date.now() + 60 * 60 * 1000,
        });

        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        const emailBody = `Please click the following link to verify your email: ${verificationUrl}`;
        const emailSubject = "Email Verification";

        const isEmailSent = await sendEmail(
          user.email,
          emailSubject,
          emailBody
        );
        if (!isEmailSent) {
          return res.status(500).json({
            message: "Email verification failed, please try again",
          });
        }

        return res
          .status(400)
          .json({ message: "Email not verified, please check your email" });
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, purpose: "login" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // update user lastLogin
    user.lastLogin = new Date();
    await user.save();

    // convert user to object
    const userData = user.toObject();
    delete userData.password;
    delete userData.twoFAOtp;
    delete userData.twoFAOtpExpires;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    // check if user is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
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
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;

    // check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email" });
    }

    if (!user.isEmailVerified) {
      return res
        .status(400)
        .json({ message: "Please verify your email first" });
    }

    const existingResetToken = await Verification.findOne({ userId: user._id });
    if (existingResetToken && existingResetToken.expiresAt > new Date()) {
      return res
        .status(400)
        .json({ message: "Password reset request already sent" });
    }

    if (existingResetToken && existingResetToken.expiresAt < new Date()) {
      await Verification.findByIdAndDelete(existingResetToken._id);
    }

    const resetToken = jwt.sign(
      { userId: user._id, purpose: "password-reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    await Verification.create({
      userId: user._id,
      token: resetToken,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailBody = `Please click the following link to reset your password: ${resetUrl}`;
    const emailSubject = "Password Reset";

    const isEmailSent = await sendEmail(user.email, emailSubject, emailBody);
    if (!isEmailSent) {
      return res.status(500).json({
        message: "Password reset email failed, please try again",
      });
    }

    return res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const verifyResetPasswordTokenAndResetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { userId, purpose } = payload;

    // check if purpose is password-reset
    if (purpose !== "password-reset") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const verificationToken = await Verification.findOne({
      userId,
      token,
    });

    if (!verificationToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (verificationToken.expiresAt < new Date()) {
      return res.status(401).json({ message: "Token expired" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // delete verification token
    await Verification.findByIdAndDelete(verificationToken._id);

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export {
  registerUser,
  loginUser,
  verifyEmail,
  resetPasswordRequest,
  verifyResetPasswordTokenAndResetPassword,
};
