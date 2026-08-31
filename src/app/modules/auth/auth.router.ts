// src/app/modules/auth/auth.router.ts
import express from "express";
import { AuthController } from "./auth.controller";
import { auth } from "./auth.middleware";

const router = express.Router();

// Step 1: Check phone status (exists, needs password vs OTP)
router.post("/check-phone", AuthController.checkPhone);

// Step 2A: Verify password and log in
router.post("/login-with-password", AuthController.loginWithPassword);

// Step 2B: Verify OTP and log in
router.post("/verify-otp", AuthController.verifyOtpAndLogin);

// Token management & session
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

// Protected routes
router.get("/me", auth(), AuthController.getMe);

export const AuthRoutes = router;