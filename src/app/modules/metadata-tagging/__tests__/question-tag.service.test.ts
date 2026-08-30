/**
 * @file question-tag.service.test.ts
 * @description Unit tests for Question Tagging and Multi-Tag Query Filter service functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as QuestionTagService from "../question-tag.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    question: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    tag: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    questionTag: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === "function") {
        return callback({
          questionTag: {
            findMany: vi.fn().mockResolvedValue([]),
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          tag: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          question: {
            create: vi.fn().mockResolvedValue({ id: "q-new-1" }),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: "q-new-1",
              questionText: "What is velocity?",
              tags: [{ tag: { id: "tag-1", name: "Physics" } }],
            }),
          },
        });
      }
      return Promise.all(callback);
    }),
  },
}));

import { prisma } from "../../../../shared/prisma";

const MOCK_QUESTION_ID = "123e4567-e89b-12d3-a456-426614174000";

describe("Question Tagging Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("attachTagsToQuestion", () => {
    it("should throw 404 ApiError if question does not exist", async () => {
      (prisma.question.findUnique as any).mockResolvedValue(null);

      await expect(
        QuestionTagService.attachTagsToQuestion("non-existent-q", { tagIds: [] }),
      ).rejects.toThrowError("Question not found");
    });

    it("should resolve existing tag or create new tag from tagNames and attach", async () => {
      (prisma.question.findUnique as any).mockResolvedValue({ id: MOCK_QUESTION_ID });
      (prisma.tag.findFirst as any).mockResolvedValue(null);
      (prisma.tag.create as any).mockResolvedValue({ id: "tag-created", name: "New Exam 2025" });

      const result = await QuestionTagService.attachTagsToQuestion(MOCK_QUESTION_ID, {
        tagNames: ["New Exam 2025"],
        replaceExisting: true,
      });

      expect(prisma.question.findUnique).toHaveBeenCalledWith({ where: { id: MOCK_QUESTION_ID } });
      expect(prisma.tag.findFirst).toHaveBeenCalled();
      expect(prisma.tag.create).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe("createQuestionWithTags", () => {
    it("should create question with options and attach tags in transaction", async () => {
      const payload = {
        questionText: "What is the unit of force?",
        questionType: "MCQ" as const,
        difficulty: "EASY" as const,
        marks: 1,
        negativeMarks: 0.25,
        options: [
          { id: "1", text: "Newton", isCorrect: true },
          { id: "2", text: "Joule", isCorrect: false },
        ],
        tagIds: ["tag-1"],
      };

      const result = await QuestionTagService.createQuestionWithTags(payload);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe("q-new-1");
    });
  });

  describe("getQuestionTags", () => {
    it("should return tags associated with the question", async () => {
      const mockAssociations = [
        { tag: { id: "t1", name: "Dhaka Board 2024" } },
        { tag: { id: "t2", name: "Physics" } },
      ];

      (prisma.questionTag.findMany as any).mockResolvedValue(mockAssociations);

      const tags = await QuestionTagService.getQuestionTags(MOCK_QUESTION_ID);

      expect(tags).toHaveLength(2);
      expect(tags[0].name).toBe("Dhaka Board 2024");
      expect(tags[1].name).toBe("Physics");
    });
  });

  describe("filterQuestionsByTags", () => {
    it("should return paginated questions with tags for AND operator", async () => {
      (prisma.tag.findMany as any).mockResolvedValue([
        { id: "tag-1" },
        { id: "tag-2" },
      ]);
      (prisma.question.count as any).mockResolvedValue(1);
      (prisma.question.findMany as any).mockResolvedValue([
        {
          id: "q-1",
          questionText: "Sample Question",
          tags: [{ tag: { id: "tag-1", name: "Dhaka Board" } }],
        },
      ]);

      const result = await QuestionTagService.filterQuestionsByTags({
        tags: ["dhaka-board", "physics"],
        operator: "AND",
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(prisma.tag.findMany).toHaveBeenCalled();
      expect(prisma.question.findMany).toHaveBeenCalled();
    });

    it("should return empty result when no specified tags exist in database", async () => {
      (prisma.tag.findMany as any).mockResolvedValue([]);

      const result = await QuestionTagService.filterQuestionsByTags({
        tags: ["non-existent-tag"],
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
