// src/app/modules/auth/auth.validation.ts
import { z } from "zod";

/**
 * Zod v4 schema for sending an OTP to a phone number.
 * Validates that the phone is an 11-digit Bangladeshi number.
 */
export const sendOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number (e.g. 01712345678)"),
});

/**
 * Zod v4 schema for verifying a 6-digit OTP and completing login.
 */
export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
  password: z.string().optional(),
});

/**
 * Admin login schema — phone + password (no OTP step).
 */
export const adminLoginSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),
  password: z.string().min(1, "Password is required"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
