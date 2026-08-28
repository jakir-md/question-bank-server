// src/app/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import {
  sendOtpService,
  verifyOtpAndLoginService,
  adminLoginService,
  getMeService,
  logoutService,
  refreshTokenService,
} from "./auth.service";
import { sendOtpSchema, verifyOtpSchema, adminLoginSchema } from "./auth.validation";
import { EnvVars } from "../../config/env";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../error/ApiError";

const IS_PROD = EnvVars.NODE_ENV === "production";

/**
 * Cookie options for the access token (short-lived, 1 hour).
 */
const accessTokenCookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
  maxAge: 1000 * 60 * 60, // 1 hour
};

/**
 * Cookie options for the refresh token (long-lived, 7 days).
 */
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

// =========================================================================
// SEND OTP
// =========================================================================

/**
 * POST /auth/send-otp
 * Validates phone number and dispatches a 6-digit OTP via SMS.
 */
export const sendOtp = catchAsync(async (req: Request, res: Response) => {
  const parsed = sendOtpSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    throw new ApiError(400, message);
  }

  const result = await sendOtpService(parsed.data.phone);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message,
    data: null,
  });
});

// =========================================================================
// VERIFY OTP & LOGIN (STUDENT)
// =========================================================================

/**
 * POST /auth/verify-otp
 * Verifies the OTP for a student and issues JWT tokens as HTTP-only cookies.
 */
export const verifyOtpAndLogin = catchAsync(async (req: Request, res: Response) => {
  const parsed = verifyOtpSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    throw new ApiError(400, message);
  }

  const { phone, otp } = parsed.data;
  const { accessToken, refreshToken, role } = await verifyOtpAndLoginService(phone, otp);

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Login successful",
    data: { role },
  });
});

// =========================================================================
// ADMIN LOGIN (PHONE + PASSWORD)
// =========================================================================

/**
 * POST /auth/login
 * Authenticates an admin with phone number and password.
 * Issues JWT tokens as HTTP-only cookies on success.
 */
export const adminLogin = catchAsync(async (req: Request, res: Response) => {
  const parsed = adminLoginSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    throw new ApiError(400, message);
  }

  const { phone, password } = parsed.data;
  const { accessToken, refreshToken, role } = await adminLoginService(phone, password);

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin login successful",
    data: { role },
  });
});

// =========================================================================
// REFRESH TOKEN
// =========================================================================

/**
 * POST /auth/refresh-token
 * Reads the refresh token from cookies and issues new tokens.
 */
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const oldRefreshToken = req.cookies.refreshToken as string | undefined;

  if (!oldRefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  const { accessToken, refreshToken: newRefreshToken } = await refreshTokenService(oldRefreshToken);

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);
  res.cookie("refreshToken", newRefreshToken, refreshTokenCookieOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Token refreshed successfully",
    data: null,
  });
});

// =========================================================================
// LOGOUT
// =========================================================================

/**
 * POST /auth/logout
 * Clears auth cookies and ends the session.
 */
export const logout = catchAsync(async (_req: Request, res: Response) => {
  await logoutService();

  const clearOptions = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? ("none" as const) : ("lax" as const),
  };

  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Logout successful",
    data: null,
  });
});

// =========================================================================
// GET ME
// =========================================================================

/**
 * GET /auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized access");
  }

  const foundUser = await getMeService(user.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User fetched successfully",
    data: foundUser,
  });
});

// =========================================================================
// NAMED EXPORT OBJECT
// =========================================================================

export const AuthController = {
  sendOtp,
  verifyOtpAndLogin,
  adminLogin,
  refreshToken,
  logout,
  getMe,
};
