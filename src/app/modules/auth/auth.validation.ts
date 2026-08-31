// src/app/modules/auth/auth.validation.ts
import { z } from "zod";

/**
 * Zod schema to check phone number step.
 * Validates that the phone is a valid 11-digit Bangladeshi number.
 */
export const checkPhoneSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number (e.g. 01712345678)"),
});

/**
 * Zod schema for password verification login step.
 */
export const loginWithPasswordSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),
  password: z
    .string()
    .min(1, "Password is required"),
});

/**
 * Zod schema for OTP verification login step.
 */
export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^01[3-9]\d{8}$/, "Invalid Bangladeshi phone number"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
});

export type CheckPhoneInput = z.infer<typeof checkPhoneSchema>;
export type LoginWithPasswordInput = z.infer<typeof loginWithPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
