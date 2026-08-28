// src/app/modules/auth/auth.router.ts
import express from "express";
import { AuthController } from "./auth.controller";
import { auth } from "./auth.middleware";

const router = express.Router();

// Student OTP-based login (2-step)
router.post("/send-otp", AuthController.sendOtp);
router.post("/verify-otp", AuthController.verifyOtpAndLogin);

// Admin phone + password login
router.post("/login", AuthController.adminLogin);

// Token management
router.post("/refresh-token", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

// Protected routes
router.get("/me", auth(), AuthController.getMe);

export const AuthRoutes = router;