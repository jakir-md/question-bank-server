// src/app/modules/auth/auth.service.test.ts
/**
 * Unit tests for auth.service.ts
 *
 * Strategy: Mock prisma and sendSMS so no real DB or SMS calls are made.
 * Tests cover: sendOtpService, verifyOtpAndLoginService, adminLoginService.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import ApiError from "../../error/ApiError";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../shared/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../../../shared/sendSMS", () => ({
  sendSMS: vi.fn().mockResolvedValue(true),
}));

vi.mock("./auth.utils", () => ({
  generateAccessToken: vi.fn().mockReturnValue("mock-access-token"),
  generateRefreshToken: vi.fn().mockReturnValue("mock-refresh-token"),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from "../../../shared/prisma";
import { sendSMS } from "../../../shared/sendSMS";
import bcrypt from "bcryptjs";
import {
  sendOtpService,
  verifyOtpAndLoginService,
  adminLoginService,
} from "./auth.service";

// ---------------------------------------------------------------------------
// sendOtpService
// ---------------------------------------------------------------------------

describe("sendOtpService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should upsert the user and send an SMS for a valid phone", async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: "user-1",
      phone: "01712345678",
      role: "STUDENT",
      isActive: true,
      otp: "123456",
      otpExpiry: new Date(),
      name: null,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await sendOtpService("01712345678");

    expect(prisma.user.upsert).toHaveBeenCalledOnce();
    expect(sendSMS).toHaveBeenCalledOnce();
    expect(result.message).toContain("OTP sent successfully");
  });

  it("should throw ApiError when SMS fails", async () => {
    vi.mocked(prisma.user.upsert).mockResolvedValue({} as never);
    vi.mocked(sendSMS).mockRejectedValue(new ApiError(500, "Failed to send SMS"));

    await expect(sendOtpService("01712345678")).rejects.toThrow(ApiError);
  });
});

// ---------------------------------------------------------------------------
// verifyOtpAndLoginService
// ---------------------------------------------------------------------------

describe("verifyOtpAndLoginService", () => {
  const futureExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const pastExpiry = new Date(Date.now() - 1000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return tokens when OTP is valid", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      phone: "01712345678",
      role: "STUDENT",
      otp: "123456",
      otpExpiry: futureExpiry,
      isActive: true,
      name: null,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await verifyOtpAndLoginService("01712345678", "123456");

    expect(result.accessToken).toBe("mock-access-token");
    expect(result.refreshToken).toBe("mock-refresh-token");
    expect(result.role).toBe("STUDENT");
    expect(prisma.user.update).toHaveBeenCalledOnce();
  });

  it("should throw 404 when user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(verifyOtpAndLoginService("01712345678", "123456")).rejects.toThrow(
      "User not found",
    );
  });

  it("should throw 401 when OTP is wrong", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      phone: "01712345678",
      role: "STUDENT",
      otp: "999999",
      otpExpiry: futureExpiry,
      isActive: true,
      name: null,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(verifyOtpAndLoginService("01712345678", "123456")).rejects.toThrow(
      "Invalid OTP",
    );
  });

  it("should throw 401 when OTP is expired", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      phone: "01712345678",
      role: "STUDENT",
      otp: "123456",
      otpExpiry: pastExpiry,
      isActive: true,
      name: null,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(verifyOtpAndLoginService("01712345678", "123456")).rejects.toThrow(
      "OTP has expired",
    );
  });
});

// ---------------------------------------------------------------------------
// adminLoginService
// ---------------------------------------------------------------------------

describe("adminLoginService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return tokens for valid admin credentials", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-1",
      phone: "01900000000",
      role: "ADMIN",
      password: "hashed-password",
      isActive: true,
      name: "Admin",
      otp: null,
      otpExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await adminLoginService("01900000000", "secret");

    expect(result.role).toBe("ADMIN");
    expect(result.accessToken).toBe("mock-access-token");
  });

  it("should throw 404 when admin not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(adminLoginService("01900000000", "wrong")).rejects.toThrow(
      "Admin account not found",
    );
  });

  it("should throw 401 on wrong password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-1",
      phone: "01900000000",
      role: "ADMIN",
      password: "hashed-password",
      isActive: true,
      name: "Admin",
      otp: null,
      otpExpiry: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(adminLoginService("01900000000", "wrong")).rejects.toThrow(
      "Invalid password",
    );
  });
});
