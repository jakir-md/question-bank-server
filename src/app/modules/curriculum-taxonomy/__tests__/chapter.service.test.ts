/**
 * @file chapter.service.test.ts
 * @description Unit tests for Chapter service operations with mocked Prisma client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as ChapterService from "../chapter/chapter.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    subject: {
      findUnique: vi.fn(),
    },
    chapter: {
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

const MOCK_SUBJECT_ID = "223e4567-e89b-12d3-a456-426614174001";

describe("Chapter Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createChapter", () => {
    it("should successfully create a chapter under a valid subject", async () => {
      const mockPayload = {
        subjectId: MOCK_SUBJECT_ID,
        name: "Vector Analysis",
        chapterNumber: 1,
        weightage: 15,
      };

      (prisma.subject.findUnique as any).mockResolvedValue({ id: MOCK_SUBJECT_ID, name: "Physics" });
      (prisma.chapter.findFirst as any).mockResolvedValue(null);
      (prisma.chapter.aggregate as any).mockResolvedValue({ _max: { orderIndex: 0 } });
      (prisma.chapter.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: "chap-123",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await ChapterService.createChapter(mockPayload);

      expect(prisma.subject.findUnique).toHaveBeenCalledWith({ where: { id: MOCK_SUBJECT_ID } });
      expect(result.id).toBe("chap-123");
      expect(result.name).toBe("Vector Analysis");
      expect(result.slug).toBe("vector-analysis");
    });

    it("should throw 404 ApiError if parent subject does not exist", async () => {
      (prisma.subject.findUnique as any).mockResolvedValue(null);

      await expect(
        ChapterService.createChapter({
          subjectId: "missing-subject",
          name: "Chapter 1",
        }),
      ).rejects.toThrowError("Parent Subject not found");
    });
  });

  describe("getChapterById", () => {
    it("should return chapter when found", async () => {
      const mockChapter = {
        id: "chap-1",
        name: "Vector Analysis",
        topics: [],
        subject: { id: MOCK_SUBJECT_ID, name: "Physics" },
      };

      (prisma.chapter.findUnique as any).mockResolvedValue(mockChapter);

      const result = await ChapterService.getChapterById("chap-1");
      expect(result).toEqual(mockChapter);
    });

    it("should throw 404 ApiError if chapter not found", async () => {
      (prisma.chapter.findUnique as any).mockResolvedValue(null);

      await expect(ChapterService.getChapterById("non-existent")).rejects.toThrowError(
        "Chapter not found",
      );
    });
  });
});
