/**
 * @file mcq-ingestion.service.test.ts
 * @description Unit tests for MCQ Ingestion (Single & Multi-Context) Service operations with mocked Prisma client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as MCQIngestionService from "../mcq-ingestion.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    question: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    questionContext: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn(),
    },
    tag: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    questionTag: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => {
      if (typeof callback === "function") {
        return callback({
          question: {
            create: vi.fn().mockImplementation(({ data }: any) =>
              Promise.resolve({ id: "q-created-1", ...data }),
            ),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: "q-created-1",
              questionText: "What is velocity?",
              correctAnswer: "A",
              options: [
                { id: "A", text: "Displacement / Time", isCorrect: true },
                { id: "B", text: "Distance / Time", isCorrect: false },
                { id: "C", text: "Acceleration / Time", isCorrect: false },
                { id: "D", text: "Force / Time", isCorrect: false },
              ],
              tags: [],
            }),
            delete: vi.fn().mockResolvedValue({ id: "q-100" }),
            count: vi.fn().mockResolvedValue(1),
          },
          questionContext: {
            create: vi.fn().mockImplementation(({ data }: any) =>
              Promise.resolve({ id: "ctx-created-1", ...data }),
            ),
            findUniqueOrThrow: vi.fn().mockResolvedValue({
              id: "ctx-created-1",
              title: "Passage Title",
              contextText: "Passage content here...",
              questions: [
                { id: "q-sub-1", questionText: "Sub-question 1", contextOrder: 1, tags: [] },
                { id: "q-sub-2", questionText: "Sub-question 2", contextOrder: 2, tags: [] },
              ],
            }),
          },
          questionTag: {
            createMany: vi.fn().mockResolvedValue({ count: 1 }),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
            findMany: vi.fn().mockResolvedValue([]),
          },
          tag: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
        });
      }
      return Promise.all(callback);
    }),
  },
}));

import { prisma } from "../../../../shared/prisma";

const mockOptions = [
  { id: "A", text: "Displacement / Time", isCorrect: true },
  { id: "B", text: "Distance / Time", isCorrect: false },
  { id: "C", text: "Acceleration / Time", isCorrect: false },
  { id: "D", text: "Force / Time", isCorrect: false },
];

describe("MCQ Ingestion Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ingestSingleMCQ", () => {
    it("should ingest a standalone MCQ, auto-sync correct answer, and resolve tags in transaction", async () => {
      const payload = {
        questionText: "What is velocity?",
        options: mockOptions,
        marks: 1.0,
        negativeMarks: 0.25,
        difficulty: "MEDIUM" as const,
        tagNames: ["Physics 1st Paper"],
      };

      (prisma.tag.findFirst as any).mockResolvedValue({ id: "tag-phy", name: "Physics 1st Paper" });

      const result = await MCQIngestionService.ingestSingleMCQ(payload);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe("q-created-1");
      expect(result.correctAnswer).toBe("A");
    });
  });

  describe("ingestMultiContextMCQ", () => {
    it("should ingest a question passage and its sub-questions atomically", async () => {
      const payload = {
        context: {
          title: "Newtonian Mechanics Passage",
          contextText: "A car accelerates from rest at 2 m/s² for 10 seconds...",
          contextType: "SCENARIO" as const,
        },
        questions: [
          {
            questionText: "What is the final velocity of the car?",
            options: mockOptions,
            marks: 1.0,
            order: 1,
          },
          {
            questionText: "What total distance did the car travel?",
            options: mockOptions,
            marks: 1.0,
            order: 2,
          },
        ],
        commonTagNames: ["Kinematics"],
      };

      (prisma.tag.findFirst as any).mockResolvedValue({ id: "tag-kin", name: "Kinematics" });

      const result = await MCQIngestionService.ingestMultiContextMCQ(payload);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe("ctx-created-1");
      expect(result.questions).toHaveLength(2);
    });
  });

  describe("getMCQs", () => {
    it("should retrieve filtered paginated questions and metadata", async () => {
      const mockQuestions = [
        {
          id: "q-1",
          questionText: "What is acceleration?",
          difficulty: "EASY",
          tags: [],
        },
      ];

      (prisma.question.count as any).mockResolvedValue(1);
      (prisma.question.findMany as any).mockResolvedValue(mockQuestions);

      const result = await MCQIngestionService.getMCQs({
        search: "acceleration",
        difficulty: "EASY",
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe("getMCQById", () => {
    it("should return question when found", async () => {
      const mockQuestion = {
        id: "q-100",
        questionText: "What is power?",
        options: mockOptions,
        tags: [],
      };

      (prisma.question.findUnique as any).mockResolvedValue(mockQuestion);

      const result = await MCQIngestionService.getMCQById("q-100");
      expect(result).toEqual(mockQuestion);
    });

    it("should throw 404 ApiError if question is not found", async () => {
      (prisma.question.findUnique as any).mockResolvedValue(null);

      await expect(MCQIngestionService.getMCQById("unknown-id")).rejects.toThrowError(
        "Question not found",
      );
    });
  });

  describe("deleteMCQ", () => {
    it("should delete question when found", async () => {
      (prisma.question.findUnique as any).mockResolvedValue({ id: "q-100", tags: [] });
      (prisma.question.delete as any).mockResolvedValue({ id: "q-100" });

      const result = await MCQIngestionService.deleteMCQ("q-100");
      expect(result.id).toBe("q-100");
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should throw 404 ApiError when deleting non-existent question", async () => {
      (prisma.question.findUnique as any).mockResolvedValue(null);

      await expect(MCQIngestionService.deleteMCQ("non-existent")).rejects.toThrowError(
        "Question not found",
      );
    });
  });

  describe("getMCQStats", () => {
    it("should return comprehensive MCQ ingestion stats", async () => {
      (prisma.question.count as any)
        .mockResolvedValueOnce(100) // totalQuestions
        .mockResolvedValueOnce(60)  // totalSingleMCQs
        .mockResolvedValueOnce(40); // totalMultiContextMCQs
      (prisma.questionContext.count as any).mockResolvedValue(15); // totalContexts
      (prisma.question.count as any)
        .mockResolvedValueOnce(30)  // easy
        .mockResolvedValueOnce(50)  // medium
        .mockResolvedValueOnce(20)  // hard
        .mockResolvedValueOnce(90)  // active
        .mockResolvedValueOnce(85); // published

      const stats = await MCQIngestionService.getMCQStats();

      expect(stats.totalQuestions).toBe(100);
      expect(stats.totalSingleMCQs).toBe(60);
      expect(stats.totalMultiContextMCQs).toBe(40);
      expect(stats.totalContexts).toBe(15);
      expect(stats.difficultyDistribution).toEqual({ EASY: 30, MEDIUM: 50, HARD: 20 });
      expect(stats.totalActive).toBe(90);
      expect(stats.totalPublished).toBe(85);
    });
  });
});
