import express from "express";
import { validateRequest } from "zod-express-middleware";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, verifyEmailSchema } from "../libs/validate-schema.js";
import { registerUser, loginUser, verifyEmail, resetPasswordRequest, verifyResetPasswordTokenAndResetPassword } from "../controller/auth-controller.js";

const router = express.Router();

router.post(
  "/register",
  validateRequest({
    body: registerSchema,
  }),
  registerUser,
);
router.post(
  "/login",
  validateRequest({
    body: loginSchema,
  }),
  loginUser,
);
router.post(
  "/verify-email",
  validateRequest({
    body: verifyEmailSchema,
  }),
  verifyEmail,
);
router.post(
  "/reset-password-request",
  validateRequest({
    body: forgotPasswordSchema,
  }),
  resetPasswordRequest,
);
router.post(
  "/reset-password",
  validateRequest({
    body: resetPasswordSchema,
  }),
  verifyResetPasswordTokenAndResetPassword,
);

export default router;