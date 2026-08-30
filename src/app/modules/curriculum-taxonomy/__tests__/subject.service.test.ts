/**
 * @file subject.service.test.ts
 * @description Unit tests for Subject service operations with mocked Prisma client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as SubjectService from "../subject/subject.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    educationLevel: {
      findUnique: vi.fn(),
    },
    subject: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    chapter: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../../../shared/prisma";

const MOCK_LEVEL_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("Subject Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSubject", () => {
    it("should successfully create a subject under an existing education level", async () => {
      const mockPayload = {
        educationLevelId: MOCK_LEVEL_ID,
        name: "Physics",
        code: "PHY",
        paper: "1st Paper",
      };

      (prisma.educationLevel.findUnique as any).mockResolvedValue({ id: MOCK_LEVEL_ID, name: "HSC" });
      (prisma.subject.findFirst as any).mockResolvedValue(null);
      (prisma.subject.aggregate as any).mockResolvedValue({ _max: { orderIndex: 0 } });
      (prisma.subject.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: "sub-123",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await SubjectService.createSubject(mockPayload);

      expect(prisma.educationLevel.findUnique).toHaveBeenCalledWith({ where: { id: MOCK_LEVEL_ID } });
      expect(result.id).toBe("sub-123");
      expect(result.code).toBe("PHY");
      expect(result.orderIndex).toBe(1);
    });

    it("should throw 404 ApiError if parent education level does not exist", async () => {
      (prisma.educationLevel.findUnique as any).mockResolvedValue(null);

      await expect(
        SubjectService.createSubject({
          educationLevelId: "non-existent-level",
          name: "Physics",
          code: "PHY",
        }),
      ).rejects.toThrowError("Parent Education Level not found");
    });

    it("should throw 400 ApiError if duplicate code exists in the same level", async () => {
      (prisma.educationLevel.findUnique as any).mockResolvedValue({ id: MOCK_LEVEL_ID });
      (prisma.subject.findFirst as any).mockResolvedValue({
        id: "existing-sub",
        code: "PHY",
        slug: "physics",
      });

      await expect(
        SubjectService.createSubject({
          educationLevelId: MOCK_LEVEL_ID,
          name: "Physics",
          code: "PHY",
        }),
      ).rejects.toThrowError("Subject with code 'PHY' already exists in this Education Level");
    });
  });

  describe("getSubjectById", () => {
    it("should return subject with chapters and education level", async () => {
      const mockSubject = {
        id: "sub-1",
        name: "Physics",
        code: "PHY",
        educationLevel: { id: MOCK_LEVEL_ID, name: "HSC", code: "HSC" },
        chapters: [],
      };

      (prisma.subject.findUnique as any).mockResolvedValue(mockSubject);

      const result = await SubjectService.getSubjectById("sub-1");
      expect(result).toEqual(mockSubject);
    });

    it("should throw 404 ApiError when subject is not found", async () => {
      (prisma.subject.findUnique as any).mockResolvedValue(null);

      await expect(SubjectService.getSubjectById("sub-missing")).rejects.toThrowError(
        "Subject not found",
      );
    });
  });

  describe("deleteSubject", () => {
    it("should delete subject when it exists", async () => {
      (prisma.subject.findUnique as any).mockResolvedValue({ id: "sub-1" });
      (prisma.subject.delete as any).mockResolvedValue({ id: "sub-1", name: "Physics" });

      const result = await SubjectService.deleteSubject("sub-1");
      expect(result.id).toBe("sub-1");
      expect(prisma.subject.delete).toHaveBeenCalledWith({ where: { id: "sub-1" } });
    });

    it("should throw 404 ApiError when deleting a non-existent subject", async () => {
      (prisma.subject.findUnique as any).mockResolvedValue(null);

      await expect(SubjectService.deleteSubject("sub-nonexistent")).rejects.toThrowError(
        "Subject not found",
      );
    });
  });
});
