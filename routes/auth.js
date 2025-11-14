import express from "express";
import { validateRequest } from "zod-express-middleware";
import { loginSchema, registerSchema, verifyEmailSchema } from "../libs/validate-schema.js";
import { registerUser, loginUser, verifyEmail } from "../controller/auth-controller.js";

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

export default router;