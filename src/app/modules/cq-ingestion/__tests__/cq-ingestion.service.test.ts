/**
 * @file cq-ingestion.service.test.ts
 * @description Unit tests for Creative Question (CQ) Ingestion Service operations with mocked Prisma client.
 * Validates atomic transaction, 4 sub-questions persistence, tag resolution, queries, update, deletion, and stats.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as CQIngestionService from "../cq-ingestion.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    question: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    questionContext: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
              Promise.resolve({ id: `q-cq-${Math.random().toString(36).substring(7)}`, ...data }),
            ),
            update: vi.fn().mockImplementation(({ where, data }: any) =>
              Promise.resolve({ id: where.id, ...data }),
            ),
            delete: vi.fn().mockResolvedValue({ id: "q-100" }),
            count: vi.fn().mockResolvedValue(4),
          },
          questionContext: {
            create: vi.fn().mockImplementation(({ data }: any) =>
              Promise.resolve({ id: "ctx-cq-1", ...data }),
            ),
            findUnique: vi.fn().mockResolvedValue({
              id: "ctx-cq-1",
              title: "দৃশ্যকল্প ১: তড়িৎ বর্তনী",
              contextText: "একটি ১২ ভোল্টের ব্যাটারির সাথে ৩টি রোধ যুক্ত...",
              contextType: "STEM",
              questions: [
                { id: "sub-1", contextOrder: 1, questionText: "তড়িৎ প্রবাহ কাকে বলে?", marks: 1.0, options: { label: "ক", cognitiveLevel: "KNOWLEDGE" } },
                { id: "sub-2", contextOrder: 2, questionText: "ওহমের সূত্রটি ব্যাখ্যা করো।", marks: 2.0, options: { label: "খ", cognitiveLevel: "COMPREHENSION" } },
                { id: "sub-3", contextOrder: 3, questionText: "বর্তনীর তুল্য রোধ নির্ণয় করো।", marks: 3.0, options: { label: "গ", cognitiveLevel: "APPLICATION" } },
                { id: "sub-4", contextOrder: 4, questionText: "বর্তনীটির তড়িৎ ক্ষমতার পরিবর্তন বিশ্লেষণ করো।", marks: 4.0, options: { label: "ঘ", cognitiveLevel: "HIGHER_ABILITY" } },
              ],
            }),
            update: vi.fn().mockImplementation(({ where, data }: any) =>
              Promise.resolve({ id: where.id, ...data }),
            ),
            delete: vi.fn().mockResolvedValue({ id: "ctx-cq-1" }),
          },
          questionTag: {
            createMany: vi.fn().mockResolvedValue({ count: 4 }),
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

const mockCQSubQuestions = [
  {
    label: "ক" as const,
    cognitiveLevel: "KNOWLEDGE" as const,
    questionText: "তড়িৎ প্রবাহ কাকে বলে?",
    marks: 1.0,
    explanation: "আধান প্রবাহের হারকে তড়িৎ প্রবাহ বলে।",
    difficulty: "EASY" as const,
    order: 1,
  },
  {
    label: "খ" as const,
    cognitiveLevel: "COMPREHENSION" as const,
    questionText: "ওহমের সূত্রটি ব্যাখ্যা করো।",
    marks: 2.0,
    explanation: "V = IR সূত্র অনুযায়ী...",
    difficulty: "MEDIUM" as const,
    order: 2,
  },
  {
    label: "গ" as const,
    cognitiveLevel: "APPLICATION" as const,
    questionText: "বর্তনীর তুল্য রোধ নির্ণয় করো।",
    marks: 3.0,
    explanation: "গণনা: Req = 6 ohm",
    difficulty: "MEDIUM" as const,
    order: 3,
  },
  {
    label: "ঘ" as const,
    cognitiveLevel: "HIGHER_ABILITY" as const,
    questionText: "বর্তনীটির তড়িৎ ক্ষমতার পরিবর্তন বিশ্লেষণ করো।",
    marks: 4.0,
    explanation: "গাণিতিক বিশ্লেষণ...",
    difficulty: "HARD" as const,
    order: 4,
  },
];

describe("CQ Ingestion Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveTagIds", () => {
    it("should resolve existing tag by name or create new custom tag", async () => {
      (prisma.tag.findFirst as any)
        .mockResolvedValueOnce({ id: "tag-dhaka", name: "Dhaka Board 2024" })
        .mockResolvedValueOnce(null);

      (prisma.tag.create as any).mockResolvedValueOnce({
        id: "tag-new-custom",
        name: "New Topic Tag",
      });

      const tagIds = await CQIngestionService.resolveTagIds(
        ["tag-existing-id"],
        ["Dhaka Board 2024", "New Topic Tag", "  "],
      );

      expect(tagIds).toContain("tag-existing-id");
      expect(tagIds).toContain("tag-dhaka");
      expect(tagIds).toContain("tag-new-custom");
      expect(tagIds).toHaveLength(3);
    });
  });

  describe("ingestCQ", () => {
    it("should atomically ingest Uddipok stimulus and 4 structured sub-questions", async () => {
      const payload = {
        stimulus: {
          title: "দৃশ্যকল্প ১: তড়িৎ বর্তনী",
          contextText: "একটি ১২ ভোল্টের ব্যাটারির সাথে ৩টি রোধ যুক্ত...",
          contextType: "STEM" as const,
        },
        questions: mockCQSubQuestions,
        totalMarks: 10.0,
        commonTagNames: ["Dhaka Board 2024"],
      };

      (prisma.tag.findFirst as any).mockResolvedValue({ id: "tag-dhaka", name: "Dhaka Board 2024" });

      const result = await CQIngestionService.ingestCQ(payload);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.id).toBe("ctx-cq-1");
      expect(result.questions).toHaveLength(4);
      expect(result.questions[0].marks).toBe(1.0);
      expect(result.questions[3].marks).toBe(4.0);
    });
  });

  describe("getCQs", () => {
    it("should retrieve filtered paginated CQ packages with search & difficulty", async () => {
      const mockContexts = [
        {
          id: "ctx-1",
          title: "দৃশ্যকল্প ১",
          contextText: "উদ্দীপক...",
          questions: mockCQSubQuestions,
        },
      ];

      (prisma.questionContext.count as any).mockResolvedValue(1);
      (prisma.questionContext.findMany as any).mockResolvedValue(mockContexts);

      const result = await CQIngestionService.getCQs({
        search: "বর্তনী",
        difficulty: "MEDIUM",
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

    it("should filter CQs by taxonomy hierarchy (educationLevel, subject, chapter, topic)", async () => {
      (prisma.questionContext.count as any).mockResolvedValue(1);
      (prisma.questionContext.findMany as any).mockResolvedValue([]);

      await CQIngestionService.getCQs({
        educationLevelId: "level-1",
        subjectId: "subject-1",
        chapterId: "chapter-1",
        topicId: "topic-1",
        tags: ["Dhaka-Board", "Physics"],
        operator: "OR",
      });

      expect(prisma.questionContext.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { educationLevelId: "level-1" },
              { subjectId: "subject-1" },
              { chapterId: "chapter-1" },
              { topicId: "topic-1" },
            ]),
          }),
        }),
      );
    });

    it("should filter CQs by multiple tags using AND operator", async () => {
      (prisma.questionContext.count as any).mockResolvedValue(1);
      (prisma.questionContext.findMany as any).mockResolvedValue([]);

      await CQIngestionService.getCQs({
        tags: ["Tag1", "Tag2"],
        operator: "AND",
      });

      expect(prisma.questionContext.findMany).toHaveBeenCalled();
    });
  });

  describe("getCQById", () => {
    it("should retrieve single CQ by UUID", async () => {
      const mockCQ = {
        id: "ctx-100",
        title: "গতিবিদ্যা সৃজনশীল",
        contextText: "একটি গাড়ি স্থির অবস্থান থেকে...",
        questions: mockCQSubQuestions,
      };

      (prisma.questionContext.findUnique as any).mockResolvedValue(mockCQ);

      const result = await CQIngestionService.getCQById("ctx-100");
      expect(result.id).toBe("ctx-100");
      expect(result.questions).toHaveLength(4);
    });

    it("should throw 404 ApiError if CQ is not found", async () => {
      (prisma.questionContext.findUnique as any).mockResolvedValue(null);

      await expect(CQIngestionService.getCQById("unknown-cq-id")).rejects.toThrowError(
        "not found",
      );
    });
  });

  describe("updateCQ", () => {
    it("should update stimulus and sub-questions successfully", async () => {
      const mockExisting = {
        id: "ctx-100",
        title: "পুরাতন দৃশ্যকল্প",
        questions: [
          { id: "sub-1", contextOrder: 1, marks: 1.0 },
          { id: "sub-2", contextOrder: 2, marks: 2.0 },
          { id: "sub-3", contextOrder: 3, marks: 3.0 },
          { id: "sub-4", contextOrder: 4, marks: 4.0 },
        ],
      };

      (prisma.questionContext.findUnique as any).mockResolvedValue(mockExisting);

      const updatePayload = {
        stimulus: {
          title: "আপডেট উদ্দীপক",
          contextText: "নতুন উদ্দীপকের লেখা...",
        },
        questions: [
          {
            label: "ক" as const,
            cognitiveLevel: "KNOWLEDGE" as const,
            questionText: "আপডেট ক প্রশ্ন?",
            marks: 1.0,
          },
        ],
        totalMarks: 10.0,
      };

      const result = await CQIngestionService.updateCQ("ctx-100", updatePayload);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should throw 404 ApiError if CQ to update does not exist", async () => {
      (prisma.questionContext.findUnique as any).mockResolvedValue(null);

      await expect(
        CQIngestionService.updateCQ("non-existent-id", {
          stimulus: { title: "Title" },
        }),
      ).rejects.toThrowError("not found");
    });
  });

  describe("deleteCQ", () => {
    it("should delete CQ and decrement tag counters", async () => {
      (prisma.questionContext.findUnique as any).mockResolvedValue({
        id: "ctx-100",
        questions: [{ id: "q-1", tags: [{ tagId: "tag-1" }] }],
      });

      const result = await CQIngestionService.deleteCQ("ctx-100");
      expect(result.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should throw 404 ApiError if CQ to delete does not exist", async () => {
      (prisma.questionContext.findUnique as any).mockResolvedValue(null);

      await expect(CQIngestionService.deleteCQ("non-existent-id")).rejects.toThrowError(
        "not found",
      );
    });
  });

  describe("getCQStats", () => {
    it("should aggregate total CQ sets and cognitive domain metrics", async () => {
      (prisma.questionContext.count as any)
        .mockResolvedValueOnce(10) // totalCQSets
        .mockResolvedValueOnce(10) // totalActive
        .mockResolvedValueOnce(10); // totalPublished

      (prisma.question.count as any)
        .mockResolvedValueOnce(40) // totalSubQuestions
        .mockResolvedValueOnce(10) // easy
        .mockResolvedValueOnce(20) // medium
        .mockResolvedValueOnce(10); // hard

      (prisma.question.findMany as any).mockResolvedValue([
        { contextOrder: 1, marks: 1.0 },
        { contextOrder: 2, marks: 2.0 },
        { contextOrder: 3, marks: 3.0 },
        { contextOrder: 4, marks: 4.0 },
      ]);

      const stats = await CQIngestionService.getCQStats();

      expect(stats.totalCQSets).toBe(10);
      expect(stats.totalSubQuestions).toBe(40);
      expect(stats.cognitiveDistribution).toEqual({
        KNOWLEDGE: 1,
        COMPREHENSION: 1,
        APPLICATION: 1,
        HIGHER_ABILITY: 1,
      });
      expect(stats.totalMarksLogged).toBe(10.0);
    });
  });
});
