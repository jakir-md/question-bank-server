/**
 * @file topic.service.test.ts
 * @description Unit tests for Topic service operations with mocked Prisma client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as TopicService from "../topic/topic.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    chapter: {
      findUnique: vi.fn(),
    },
    topic: {
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

const MOCK_CHAPTER_ID = "323e4567-e89b-12d3-a456-426614174002";

describe("Topic Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createTopic", () => {
    it("should successfully create a topic under a valid chapter", async () => {
      const mockPayload = {
        chapterId: MOCK_CHAPTER_ID,
        name: "Scalar and Vector Products",
        importanceLevel: "HIGH" as const,
        difficultyLevel: "MEDIUM" as const,
      };

      (prisma.chapter.findUnique as any).mockResolvedValue({ id: MOCK_CHAPTER_ID, name: "Vectors" });
      (prisma.topic.findFirst as any).mockResolvedValue(null);
      (prisma.topic.aggregate as any).mockResolvedValue({ _max: { orderIndex: 0 } });
      (prisma.topic.create as any).mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: "top-123",
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      );

      const result = await TopicService.createTopic(mockPayload);

      expect(prisma.chapter.findUnique).toHaveBeenCalledWith({ where: { id: MOCK_CHAPTER_ID } });
      expect(result.id).toBe("top-123");
      expect(result.name).toBe("Scalar and Vector Products");
      expect(result.importanceLevel).toBe("HIGH");
    });

    it("should throw 404 ApiError if parent chapter is missing", async () => {
      (prisma.chapter.findUnique as any).mockResolvedValue(null);

      await expect(
        TopicService.createTopic({
          chapterId: "missing-chapter",
          name: "Topic 1",
        }),
      ).rejects.toThrowError("Parent Chapter not found");
    });
  });

  describe("getTopicById", () => {
    it("should return topic if found", async () => {
      const mockTopic = {
        id: "top-1",
        name: "Cross Product",
        subTopics: [],
        chapter: { id: MOCK_CHAPTER_ID, name: "Vectors" },
      };

      (prisma.topic.findUnique as any).mockResolvedValue(mockTopic);

      const result = await TopicService.getTopicById("top-1");
      expect(result).toEqual(mockTopic);
    });

    it("should throw 404 ApiError if topic does not exist", async () => {
      (prisma.topic.findUnique as any).mockResolvedValue(null);

      await expect(TopicService.getTopicById("unknown-topic")).rejects.toThrowError(
        "Topic not found",
      );
    });
  });
});
