/**
 * @file taxonomy-tree.service.test.ts
 * @description Unit tests for Taxonomy Tree, Lineage, and Analytics service functions.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiError from "../../../error/ApiError";
import * as TaxonomyTreeService from "../taxonomy-tree/taxonomy-tree.service";

vi.mock("../../../../shared/prisma", () => ({
  prisma: {
    educationLevel: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    subject: {
      count: vi.fn(),
    },
    chapter: {
      count: vi.fn(),
    },
    topic: {
      findUnique: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

import { prisma } from "../../../../shared/prisma";

describe("Taxonomy Tree & Analytics Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFullTaxonomyTree", () => {
    it("should assemble a complete nested 4-tier hierarchy with aggregated counts", async () => {
      const mockLevels = [
        {
          id: "level-1",
          name: "HSC",
          code: "HSC",
          slug: "hsc",
          description: null,
          icon: null,
          color: null,
          orderIndex: 0,
          isActive: true,
          isPublished: true,
          subjects: [
            {
              id: "subject-1",
              name: "Physics",
              code: "PHY",
              slug: "physics",
              description: null,
              icon: null,
              color: null,
              paper: "1st Paper",
              subjectCode: "174",
              orderIndex: 0,
              isActive: true,
              isPublished: true,
              chapters: [
                {
                  id: "chapter-1",
                  chapterNumber: 1,
                  name: "Physical World and Measurement",
                  slug: "physical-world",
                  description: null,
                  totalEstimatedHours: 6,
                  weightage: 10,
                  orderIndex: 0,
                  isActive: true,
                  isPublished: true,
                  topics: [
                    {
                      id: "topic-1",
                      topicNumber: "1.1",
                      name: "Units and Dimensions",
                      slug: "units-dimensions",
                      description: null,
                      learningObjectives: ["Understand SI units"],
                      importanceLevel: "HIGH",
                      difficultyLevel: "EASY",
                      orderIndex: 0,
                      isActive: true,
                      isPublished: true,
                      subTopics: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      (prisma.educationLevel.findMany as any).mockResolvedValue(mockLevels);

      const result = await TaxonomyTreeService.getFullTaxonomyTree(false);

      expect(result.tree).toHaveLength(1);
      expect(result.meta.totalLevels).toBe(1);
      expect(result.meta.totalSubjects).toBe(1);
      expect(result.meta.totalChapters).toBe(1);
      expect(result.meta.totalTopics).toBe(1);

      const levelNode = result.tree[0];
      expect(levelNode.subjectCount).toBe(1);
      expect(levelNode.subjects[0].chapterCount).toBe(1);
      expect(levelNode.subjects[0].chapters[0].topics[0].name).toBe("Units and Dimensions");
    });
  });

  describe("getTopicLineage", () => {
    it("should resolve full ancestry breadcrumb from topic to education level", async () => {
      const mockTopicRecord = {
        id: "topic-101",
        name: "Vector Multiplication",
        topicNumber: "2.1",
        slug: "vector-multiplication",
        parentTopic: null,
        chapter: {
          id: "chap-101",
          name: "Vectors",
          chapterNumber: 2,
          slug: "vectors",
          subject: {
            id: "sub-101",
            name: "Physics",
            code: "PHY",
            slug: "physics",
            educationLevel: {
              id: "lvl-101",
              name: "HSC",
              code: "HSC",
              slug: "hsc",
            },
          },
        },
      };

      (prisma.topic.findUnique as any).mockResolvedValue(mockTopicRecord);

      const lineage = await TaxonomyTreeService.getTopicLineage("topic-101");

      expect(lineage.level.name).toBe("HSC");
      expect(lineage.subject.name).toBe("Physics");
      expect(lineage.chapter.name).toBe("Vectors");
      expect(lineage.topic.name).toBe("Vector Multiplication");
    });

    it("should throw 404 ApiError if topic does not exist", async () => {
      (prisma.topic.findUnique as any).mockResolvedValue(null);

      await expect(
        TaxonomyTreeService.getTopicLineage("non-existent-id"),
      ).rejects.toThrowError("Topic not found");
    });
  });

  describe("getTaxonomyStats", () => {
    it("should return comprehensive statistics with breakdowns", async () => {
      (prisma.educationLevel.count as any).mockResolvedValueOnce(3).mockResolvedValueOnce(3);
      (prisma.subject.count as any).mockResolvedValueOnce(12).mockResolvedValueOnce(10);
      (prisma.chapter.count as any).mockResolvedValueOnce(45).mockResolvedValueOnce(40);
      (prisma.topic.count as any)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(140)
        .mockResolvedValueOnce(130);

      (prisma.topic.groupBy as any)
        .mockResolvedValueOnce([
          { importanceLevel: "HIGH", _count: { id: 80 } },
          { importanceLevel: "MEDIUM", _count: { id: 70 } },
        ])
        .mockResolvedValueOnce([
          { difficultyLevel: "EASY", _count: { id: 50 } },
          { difficultyLevel: "MEDIUM", _count: { id: 100 } },
        ]);

      const stats = await TaxonomyTreeService.getTaxonomyStats();

      expect(stats.totalLevels).toBe(3);
      expect(stats.totalSubjects).toBe(12);
      expect(stats.totalChapters).toBe(45);
      expect(stats.totalTopics).toBe(150);
      expect(stats.importanceBreakdown).toEqual({ HIGH: 80, MEDIUM: 70 });
      expect(stats.difficultyBreakdown).toEqual({ EASY: 50, MEDIUM: 100 });
    });
  });
});
