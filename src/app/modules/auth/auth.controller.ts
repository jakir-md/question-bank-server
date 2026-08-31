// src/app/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import {
  checkPhoneService,
  loginWithPasswordService,
  verifyOtpAndLoginService,
  getMeService,
  logoutService,
  refreshTokenService,
} from "./auth.service";
import {
  checkPhoneSchema,
  loginWithPasswordSchema,
  verifyOtpSchema,
} from "./auth.validation";
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
// STEP 1: CHECK PHONE & DISPATCH OTP IF NEEDED
// =========================================================================

/**
 * POST /auth/check-phone
 * Checks if a user has a password set. Registers new user & sends OTP if no password is set.
 */
export const checkPhone = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = checkPhoneSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    throw new ApiError(400, message);
  }

  const result = await checkPhoneService(parsed.data.phone);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: result.message ?? "Phone verified successfully",
    data: {
      hasPassword: result.hasPassword,
    },
  });
});

// =========================================================================
// STEP 2 - OPTION A: LOGIN WITH PASSWORD (ADMIN / PASSWORD-SET USERS)
// =========================================================================

/**
 * POST /auth/login-with-password
 * Verifies password and logs in the user, returning role and setting token cookies.
 */
export const loginWithPassword = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = loginWithPasswordSchema.safeParse(req.body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    throw new ApiError(400, message);
  }

  const { phone, password } = parsed.data;
  const { accessToken, refreshToken, role } = await loginWithPasswordService(phone, password);

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
// STEP 2 - OPTION B: VERIFY OTP AND LOGIN (OTP USERS)
// =========================================================================

/**
 * POST /auth/verify-otp
 * Verifies the 6-digit OTP and logs in the user, returning role and setting token cookies.
 */
export const verifyOtpAndLogin = catchAsync(async (req: Request, res: Response): Promise<void> => {
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
    message: "OTP verification successful, login complete",
    data: { role },
  });
});

// =========================================================================
// REFRESH TOKEN & SESSIONS
// =========================================================================

/**
 * POST /auth/refresh-token
 * Reads the refresh token from cookies and issues new tokens.
 */
export const refreshToken = catchAsync(async (req: Request, res: Response): Promise<void> => {
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

/**
 * POST /auth/logout
 * Clears auth cookies and ends the session.
 */
export const logout = catchAsync(async (_req: Request, res: Response): Promise<void> => {
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

/**
 * GET /auth/me
 * Returns the currently authenticated user's profile.
 */
export const getMe = catchAsync(async (req: Request, res: Response): Promise<void> => {
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
// EXPORT CONTROLLER OBJECT
// =========================================================================

export const AuthController = {
  checkPhone,
  loginWithPassword,
  verifyOtpAndLogin,
  refreshToken,
  logout,
  getMe,
};
