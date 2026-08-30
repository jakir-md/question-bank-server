/**
 * @file education-level.service.test.ts
 * @description Unit tests for Education Level service operations with mocked Prisma client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as EducationLevelService from "../education-level/education-level.service";

// Mock the shared Prisma instance
vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    educationLevel: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../../../shared/prisma";

describe("Education Level Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createEducationLevel", () => {
    it("should successfully create a new education level with auto slug and next orderIndex", () => {
      const mockPayload = {
        name: "Higher Secondary Certificate",
        code: "HSC",
        description: "Standard 11-12 curriculum",
      };

      (prisma.educationLevel.findFirst as any).mockResolvedValue(null);
      (prisma.educationLevel.aggregate as any).mockResolvedValue({
        _max: { orderIndex: 2 },
      });
      (prisma.educationLevel.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: "mock-id-123",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      return EducationLevelService.createEducationLevel(mockPayload).then((result) => {
        expect(prisma.educationLevel.findFirst).toHaveBeenCalled();
        expect(prisma.educationLevel.create).toHaveBeenCalledWith({
          data: {
            name: "Higher Secondary Certificate",
            code: "HSC",
            slug: "higher-secondary-certificate",
            description: "Standard 11-12 curriculum",
            icon: null,
            color: null,
            orderIndex: 3,
            isActive: true,
            isPublished: false,
          },
        });
        expect(result.id).toBe("mock-id-123");
        expect(result.slug).toBe("higher-secondary-certificate");
      });
    });

    it("should throw ApiError (400) if code already exists", async () => {
      const mockPayload = {
        name: "Higher Secondary Certificate",
        code: "HSC",
      };

      (prisma.educationLevel.findFirst as any).mockResolvedValue({
        id: "existing-id",
        code: "HSC",
        slug: "hsc",
      });

      await expect(
        EducationLevelService.createEducationLevel(mockPayload),
      ).rejects.toThrowError(ApiError);
    });

    it("should throw ApiError (400) if slug already exists", async () => {
      const mockPayload = {
        name: "Higher Secondary",
        code: "HSC-NEW",
        slug: "hsc-existing",
      };

      (prisma.educationLevel.findFirst as any).mockResolvedValue({
        id: "existing-id",
        code: "OTHER-CODE",
        slug: "hsc-existing",
      });

      await expect(
        EducationLevelService.createEducationLevel(mockPayload),
      ).rejects.toThrowError("Education Level with slug 'hsc-existing' already exists");
    });
  });

  describe("getEducationLevelById", () => {
    it("should return the education level if found", async () => {
      const mockLevel = {
        id: "level-1",
        name: "HSC",
        code: "HSC",
        subjects: [],
      };

      (prisma.educationLevel.findUnique as any).mockResolvedValue(mockLevel);

      const result = await EducationLevelService.getEducationLevelById("level-1");
      expect(result).toEqual(mockLevel);
    });

    it("should throw 404 ApiError if not found", async () => {
      (prisma.educationLevel.findUnique as any).mockResolvedValue(null);

      await expect(
        EducationLevelService.getEducationLevelById("non-existent"),
      ).rejects.toThrowError("Education Level not found");
    });
  });

  describe("getAllEducationLevels", () => {
    it("should return paginated items and metadata", async () => {
      const mockData = [
        { id: "1", name: "Level 1", code: "L1", orderIndex: 0 },
        { id: "2", name: "Level 2", code: "L2", orderIndex: 1 },
      ];

      (prisma.educationLevel.count as any).mockResolvedValue(2);
      (prisma.educationLevel.findMany as any).mockResolvedValue(mockData);

      const result = await EducationLevelService.getAllEducationLevels({
        page: 1,
        limit: 10,
        search: "Level",
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });
  });

  describe("toggleEducationLevelStatus", () => {
    it("should toggle isActive state from true to false", async () => {
      (prisma.educationLevel.findUnique as any).mockResolvedValue({
        id: "lvl-1",
        isActive: true,
      });
      (prisma.educationLevel.update as any).mockResolvedValue({
        id: "lvl-1",
        isActive: false,
      });

      const result = await EducationLevelService.toggleEducationLevelStatus("lvl-1");
      expect(result.isActive).toBe(false);
      expect(prisma.educationLevel.update).toHaveBeenCalledWith({
        where: { id: "lvl-1" },
        data: { isActive: false },
      });
    });
  });
});
