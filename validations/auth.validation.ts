import { z } from "zod";

export const loginSchema = z.object({
  userEmail: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  userName: z.string().min(3, "Name must be at least 3 characters"),
  userEmail: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters")
});

export const forgotPasswordSchema = z.object({
  userEmail: z.string().email("Invalid email format"),
});

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

