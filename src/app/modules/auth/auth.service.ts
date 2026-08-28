// src/app/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";
import ApiError from "../../error/ApiError";
import { prisma } from "../../../shared/prisma";
import { generateAccessToken, generateRefreshToken } from "./auth.utils";
import { sendSMS } from "../../../shared/sendSMS";

// =========================================================================
// HELPERS
// =========================================================================

/**
 * Generates a 6-digit numeric OTP string.
 *
 * @returns A random 6-digit OTP string.
 */
const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * OTP validity window in milliseconds (5 minutes).
 */
const OTP_EXPIRY_MS = 5 * 60 * 1000;

// =========================================================================
// SEND OTP SERVICE
// =========================================================================

/**
 * Sends a 6-digit OTP to the given phone number.
 * If the user does not exist yet, they are NOT created at this step —
 * creation happens only after successful OTP verification.
 *
 * @param phone - The 11-digit Bangladeshi phone number.
 * @returns A message confirming OTP was sent.
 */
export const sendOtpService = async (phone: string): Promise<{ message: string }> => {
  try {
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    // Upsert: create user placeholder if first time, or update OTP for existing user
    await prisma.user.upsert({
      where: { phone },
      update: { otp, otpExpiry },
      create: {
        phone,
        otp,
        otpExpiry,
        role: "STUDENT",
        isActive: true,
      },
    });

    const smsText = `Your Smart Question Bank OTP is: ${otp}. Valid for 5 minutes. Do not share it.`;
    await sendSMS(phone, smsText);

    return { message: "OTP sent successfully to your phone number." };
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to send OTP: " + message);
  }
};

// =========================================================================
// VERIFY OTP & LOGIN SERVICE (STUDENT)
// =========================================================================

/**
 * Verifies the OTP for a student and issues JWT tokens on success.
 * The user record was created during sendOtpService; this step activates it.
 *
 * @param phone - The 11-digit Bangladeshi phone number.
 * @param otp   - The 6-digit OTP entered by the student.
 * @returns Access token, refresh token, and the user's role.
 */
export const verifyOtpAndLoginService = async (
  phone: string,
  otp: string,
): Promise<{ accessToken: string; refreshToken: string; role: string }> => {
  try {
    const user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      throw new ApiError(404, "User not found. Please request a new OTP.");
    }

    if (user.otp !== otp) {
      throw new ApiError(401, "Invalid OTP. Please try again.");
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new ApiError(401, "OTP has expired. Please request a new one.");
    }

    // Clear OTP after successful verification
    await prisma.user.update({
      where: { phone },
      data: { otp: null, otpExpiry: null, isActive: true },
    });

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    return { accessToken, refreshToken, role: user.role };
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "OTP verification failed: " + message);
  }
};

// =========================================================================
// ADMIN LOGIN SERVICE (PHONE + PASSWORD)
// =========================================================================

/**
 * Authenticates an admin user using phone number and password.
 * Admins are pre-seeded and do NOT go through the OTP flow.
 *
 * @param phone    - The admin's registered phone number.
 * @param password - The admin's plaintext password.
 * @returns Access token, refresh token, and the user's role.
 */
export const adminLoginService = async (
  phone: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; role: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { phone, isActive: true },
    });

    if (!user || user.role !== "ADMIN") {
      throw new ApiError(404, "Admin account not found.");
    }

    if (!user.password) {
      throw new ApiError(401, "Admin account has no password set. Contact support.");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new ApiError(401, "Invalid password.");
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    return { accessToken, refreshToken, role: user.role };
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Admin login failed: " + message);
  }
};

// =========================================================================
// GET ME SERVICE
// =========================================================================

/**
 * Fetches the currently authenticated user's profile by ID.
 *
 * @param userId - The user's unique identifier (UUID).
 * @returns The user's public profile fields.
 */
export const getMeService = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to fetch user data: " + message);
  }
};

// =========================================================================
// LOGOUT SERVICE
// =========================================================================

/**
 * Logout is handled by clearing cookies on the controller level.
 * This service is a placeholder for any future server-side session cleanup.
 *
 * @returns true
 */
export const logoutService = async (): Promise<boolean> => true;

// =========================================================================
// REFRESH TOKEN SERVICE
// =========================================================================

import jwt from "jsonwebtoken";

/**
 * Generates a new access and refresh token pair from a valid refresh token.
 *
 * @param oldRefreshToken - The existing refresh token from the cookie.
 * @returns New access token and refresh token.
 */
export const refreshTokenService = async (
  oldRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    ) as jwt.JwtPayload & { userId: string; role: string };

    const { userId, role } = decoded;

    const accessToken = generateAccessToken(userId, role);
    const refreshToken = generateRefreshToken(userId, role);

    return { accessToken, refreshToken };
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
};

// =========================================================================
// EXPORTS
// =========================================================================

export const AuthServices = {
  sendOtpService,
  verifyOtpAndLoginService,
  adminLoginService,
  getMeService,
  logoutService,
  refreshTokenService,
};
