import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 6 characters long"),
  name: z.string().min(3, "Name must be at least 3 characters long"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 6 characters long"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const createWorkspaceSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
});

export {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  createWorkspaceSchema,
};
