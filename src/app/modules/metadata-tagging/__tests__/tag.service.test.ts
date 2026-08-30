/**
 * @file tag.service.test.ts
 * @description Unit tests for Tag Service CRUD, autocomplete, and stats with mocked Prisma client.
 */

import { TagCategory } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as TagService from "../tag.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    tag: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    questionTag: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "../../../../shared/prisma";

describe("Tag Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTag", () => {
    it("should successfully create a new tag with auto-slug and category defaults", async () => {
      const payload = {
        name: "Dhaka Board 2024",
        category: TagCategory.BOARD_EXAM,
      };

      (prisma.tag.findFirst as any).mockResolvedValue(null);
      (prisma.tag.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: "tag-1",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await TagService.createTag(payload);

      expect(prisma.tag.findFirst).toHaveBeenCalled();
      expect(result.id).toBe("tag-1");
      expect(result.slug).toBe("dhaka-board-2024");
      expect(result.category).toBe(TagCategory.BOARD_EXAM);
      expect(result.color).toBe("#3B82F6"); // Default Board Exam color
    });

    it("should throw ApiError (400) if tag name already exists", async () => {
      (prisma.tag.findFirst as any).mockResolvedValue({
        id: "existing-id",
        name: "Dhaka Board 2024",
        slug: "dhaka-board-2024",
      });

      await expect(
        TagService.createTag({ name: "Dhaka Board 2024" }),
      ).rejects.toThrowError(ApiError);
    });
  });

  describe("autocompleteTags", () => {
    it("should return matches ordered by usageCount desc", async () => {
      const mockMatches = [
        { id: "tag-1", name: "BUET 2023", slug: "buet-2023", usageCount: 45 },
        { id: "tag-2", name: "BUET 2022", slug: "buet-2022", usageCount: 30 },
      ];

      (prisma.tag.findMany as any).mockResolvedValue(mockMatches);

      const results = await TagService.autocompleteTags({ query: "BUET", limit: 5 });

      expect(results).toHaveLength(2);
      expect(prisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          orderBy: [{ usageCount: "desc" }, { name: "asc" }],
        }),
      );
    });

    it("should return empty array when query is empty", async () => {
      const results = await TagService.autocompleteTags({ query: "   " });
      expect(results).toEqual([]);
      expect(prisma.tag.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getTagById", () => {
    it("should return tag with associated question counts", async () => {
      const mockTag = {
        id: "tag-1",
        name: "Dhaka Board",
        _count: { questions: 12 },
        questions: [],
      };

      (prisma.tag.findUnique as any).mockResolvedValue(mockTag);

      const result = await TagService.getTagById("tag-1");
      expect(result.name).toBe("Dhaka Board");
      expect(result._count.questions).toBe(12);
    });

    it("should throw 404 ApiError if tag is not found", async () => {
      (prisma.tag.findUnique as any).mockResolvedValue(null);

      await expect(TagService.getTagById("unknown-id")).rejects.toThrowError(
        "Tag not found",
      );
    });
  });

  describe("bulkCreateOrFindTags", () => {
    it("should find existing tag or create new tag", async () => {
      const existingTag = {
        id: "tag-exist",
        name: "Medical 2023",
        slug: "medical-2023",
      };

      (prisma.tag.findFirst as any)
        .mockResolvedValueOnce(existingTag) // Medical 2023 exists
        .mockResolvedValueOnce(null); // DU 2023 is new

      (prisma.tag.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({ id: "tag-new", ...data }),
      );

      const results = await TagService.bulkCreateOrFindTags({
        tags: [
          { name: "Medical 2023" },
          { name: "DU 2023", category: TagCategory.ADMISSION_TEST },
        ],
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("tag-exist");
      expect(results[1].id).toBe("tag-new");
    });
  });

  describe("getTagStats", () => {
    it("should aggregate tag statistics and top tags", async () => {
      (prisma.tag.count as any)
        .mockResolvedValueOnce(25) // totalTags
        .mockResolvedValueOnce(20); // activeTags
      (prisma.questionTag.count as any).mockResolvedValue(150);
      (prisma.tag.groupBy as any).mockResolvedValue([
        { category: TagCategory.BOARD_EXAM, _count: { id: 10 } },
      ]);
      (prisma.tag.findMany as any).mockResolvedValue([
        { id: "tag-1", name: "Dhaka Board 2024", usageCount: 50 },
      ]);

      const stats = await TagService.getTagStats();

      expect(stats.totalTags).toBe(25);
      expect(stats.activeTags).toBe(20);
      expect(stats.inactiveTags).toBe(5);
      expect(stats.totalQuestionAttachments).toBe(150);
      expect(stats.topTags).toHaveLength(1);
    });
  });
});
