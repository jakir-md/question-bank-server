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
// CHECK PHONE SERVICE (Step 1)
// =========================================================================

/**
 * Checks if a user exists with the given phone number.
 * - If user exists and has a password set, returns `{ hasPassword: true }`.
 * - If user does not exist, registers them as a STUDENT, sends an OTP, and returns `{ hasPassword: false }`.
 * - If user exists with no password, sends an OTP and returns `{ hasPassword: false }`.
 *
 * @param phone - The 11-digit Bangladeshi phone number.
 * @returns Object indicating if the user has a password set, along with a success message if OTP was sent.
 */
export const checkPhoneService = async (
  phone: string,
): Promise<{ hasPassword: boolean; message?: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (user && user.password) {
      // User exists and has a password set (e.g. Admin or password-set users)
      return { hasPassword: true };
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);

    if (user) {
      // User exists but has no password (uses OTP login)
      await prisma.user.update({
        where: { phone },
        data: { otp, otpExpiry },
      });
    } else {
      // User does not exist, register them as a STUDENT automatically
      await prisma.user.create({
        data: {
          phone,
          role: "STUDENT",
          isActive: true,
          otp,
          otpExpiry,
        },
      });
    }

    const smsText = `Your Smart Question Bank OTP is: ${otp}. Valid for 5 minutes.`;
    await sendSMS(phone, smsText);

    return {
      hasPassword: false,
      message: "OTP sent successfully to your phone number.",
    };
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to verify phone: " + message);
  }
};

// =========================================================================
// PASSWORD LOGIN SERVICE (Step 2 - Option A)
// =========================================================================

/**
 * Authenticates a user using phone number and password.
 *
 * @param phone    - The registered phone number.
 * @param password - The plaintext password.
 * @returns Access token, refresh token, and the user's role.
 */
export const loginWithPasswordService = async (
  phone: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; role: string }> => {
  try {
    const user = await prisma.user.findUnique({
      where: { phone, isActive: true },
    });

    if (!user) {
      throw new ApiError(404, "User account not found.");
    }

    if (!user.password) {
      throw new ApiError(
        400,
        "No password set for this account. Please use OTP login.",
      );
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new ApiError(401, "Password mismatch.");
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id, user.role);

    return { accessToken, refreshToken, role: user.role };
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Login failed: " + message);
  }
};

// =========================================================================
// OTP LOGIN SERVICE (Step 2 - Option B)
// =========================================================================

/**
 * Verifies the OTP for a user and issues JWT tokens on success.
 *
 * @param phone - The 11-digit Bangladeshi phone number.
 * @param otp   - The 6-digit OTP entered by the user.
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
    console.log(
      "User OTP from DB:",
      user.otp,
      "user otp",
      otp,
      "User OTP Expiry:",
      user.otpExpiry,
    );
    if (user.otp !== otp) {
      throw new ApiError(401, "OTP mismatch.");
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
        classId: true
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
  checkPhoneService,
  loginWithPasswordService,
  verifyOtpAndLoginService,
  getMeService,
  logoutService,
  refreshTokenService,
};
