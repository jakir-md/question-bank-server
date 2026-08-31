// src/app/modules/auth/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import ApiError from "../../error/ApiError";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../shared/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
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
  checkPhoneService,
  loginWithPasswordService,
  verifyOtpAndLoginService,
} from "./auth.service";

describe("checkPhoneService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return hasPassword: true if user exists and has a password set", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      phone: "01712345678",
      password: "hashed_password",
      role: "ADMIN",
      isActive: true,
      otp: null,
      otpExpiry: null,
      isOnboarded: true,
      classId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await checkPhoneService("01712345678");

    expect(result.hasPassword).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(sendSMS).not.toHaveBeenCalled();
  });

  it("should generate/send OTP and return hasPassword: false if user exists but has no password set", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "student-1",
      name: null,
      phone: "01712345678",
      password: null,
      role: "STUDENT",
      isActive: true,
      otp: null,
      otpExpiry: null,
      isOnboarded: false,
      classId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const result = await checkPhoneService("01712345678");

    expect(result.hasPassword).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledOnce();
    expect(sendSMS).toHaveBeenCalledOnce();
  });

  it("should create user, generate/send OTP, and return hasPassword: false if user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({} as never);

    const result = await checkPhoneService("01712345678");

    expect(result.hasPassword).toBe(false);
    expect(prisma.user.create).toHaveBeenCalledOnce();
    expect(sendSMS).toHaveBeenCalledOnce();
  });
});

describe("loginWithPasswordService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return tokens when password is valid", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      phone: "01712345678",
      password: "hashed_password",
      role: "ADMIN",
      isActive: true,
      otp: null,
      otpExpiry: null,
      isOnboarded: true,
      classId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await loginWithPasswordService("01712345678", "my-password");

    expect(result.accessToken).toBe("mock-access-token");
    expect(result.refreshToken).toBe("mock-refresh-token");
    expect(result.role).toBe("ADMIN");
  });

  it("should throw ApiError if password mismatches", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "admin-1",
      name: "Admin",
      phone: "01712345678",
      password: "hashed_password",
      role: "ADMIN",
      isActive: true,
      otp: null,
      otpExpiry: null,
      isOnboarded: true,
      classId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(loginWithPasswordService("01712345678", "wrong-password")).rejects.toThrow(
      "Password mismatch",
    );
  });
});

describe("verifyOtpAndLoginService", () => {
  const futureExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const pastExpiry = new Date(Date.now() - 1000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return tokens when OTP is valid", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "student-1",
      name: null,
      phone: "01712345678",
      role: "STUDENT",
      otp: "123456",
      otpExpiry: futureExpiry,
      isActive: true,
      password: null,
      isOnboarded: false,
      classId: null,
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

  it("should throw ApiError when OTP has expired", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "student-1",
      name: null,
      phone: "01712345678",
      role: "STUDENT",
      otp: "123456",
      otpExpiry: pastExpiry,
      isActive: true,
      password: null,
      isOnboarded: false,
      classId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(verifyOtpAndLoginService("01712345678", "123456")).rejects.toThrow(
      "OTP has expired",
    );
  });
});
