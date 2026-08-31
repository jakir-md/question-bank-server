// src/app/modules/classSubject/classSubject.service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import ApiError from "../../error/ApiError";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../../../shared/prisma", () => ({
  prisma: {
    academicClass: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    subject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    topic: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from "../../../shared/prisma";
import {
  getAllClassesService,
  createClassService,
  getSubjectsByClassService,
  createSubjectService,
  createTopicService,
  completeOnboardingService,
} from "./classSubject.service";

describe("getAllClassesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of classes", async () => {
    const mockClasses = [{ id: "c-1", name: "Class 9" }];
    vi.mocked(prisma.academicClass.findMany).mockResolvedValue(mockClasses as never);

    const result = await getAllClassesService();
    expect(result).toEqual(mockClasses);
    expect(prisma.academicClass.findMany).toHaveBeenCalledOnce();
  });
});

describe("createClassService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create class if name is unique", async () => {
    vi.mocked(prisma.academicClass.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.academicClass.create).mockResolvedValue({
      id: "c-1",
      name: "Class 9",
    } as never);

    const result = await createClassService("Class 9");
    expect(result.name).toBe("Class 9");
    expect(prisma.academicClass.create).toHaveBeenCalledOnce();
  });

  it("should throw ApiError if class name is already taken", async () => {
    vi.mocked(prisma.academicClass.findUnique).mockResolvedValue({
      id: "c-1",
      name: "Class 9",
    } as never);

    await expect(createClassService("Class 9")).rejects.toThrow("Class name already exists.");
  });
});

describe("createSubjectService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create subject under a valid class", async () => {
    vi.mocked(prisma.academicClass.findUnique).mockResolvedValue({ id: "c-1" } as never);
    vi.mocked(prisma.subject.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.subject.create).mockResolvedValue({
      id: "s-1",
      name: "Physics",
      classId: "c-1",
    } as never);

    const result = await createSubjectService("Physics", "c-1");
    expect(result.name).toBe("Physics");
    expect(prisma.subject.create).toHaveBeenCalledOnce();
  });

  it("should throw ApiError if class level is missing", async () => {
    vi.mocked(prisma.academicClass.findUnique).mockResolvedValue(null);

    await expect(createSubjectService("Physics", "c-missing")).rejects.toThrow(
      "Target academic class not found.",
    );
  });
});

describe("completeOnboardingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update student profile status", async () => {
    vi.mocked(prisma.academicClass.findUnique).mockResolvedValue({ id: "c-1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "u-1",
      name: "Alice",
      classId: "c-1",
      isOnboarded: true,
    } as never);

    const result = await completeOnboardingService("u-1", "Alice", "c-1");
    expect(result.isOnboarded).toBe(true);
    expect(result.name).toBe("Alice");
    expect(prisma.user.update).toHaveBeenCalledOnce();
  });
});
