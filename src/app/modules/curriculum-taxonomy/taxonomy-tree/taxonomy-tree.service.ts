/**
 * @file taxonomy-tree.service.ts
 * @description Business logic for Full Taxonomy Tree, Lineage Resolution, and Analytics (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { prisma } from "../../../../shared/prisma";
import ApiError from "../../../error/ApiError";
import {
  ITaxonomyLevelNode,
  ITaxonomyStats,
  ITaxonomyTopicNode,
  ITaxonomyTreeResponse,
  ITopicLineage,
} from "../taxonomy.interface";

/**
 * Retrieves the complete 4-tier curriculum taxonomy hierarchy as a structured nested tree.
 *
 * @param onlyActive - If true, only retrieves active items for student apps/practice
 * @returns Structured hierarchical tree with item counts
 */
export async function getFullTaxonomyTree(onlyActive: boolean = false): Promise<ITaxonomyTreeResponse> {
  const activeCondition = onlyActive ? { isActive: true } : {};

  const levels = await prisma.educationLevel.findMany({
    where: activeCondition,
    orderBy: { orderIndex: "asc" },
    include: {
      subjects: {
        where: activeCondition,
        orderBy: { orderIndex: "asc" },
        include: {
          chapters: {
            where: activeCondition,
            orderBy: { orderIndex: "asc" },
            include: {
              topics: {
                where: {
                  ...activeCondition,
                  parentTopicId: null, // Get top-level topics first
                },
                orderBy: { orderIndex: "asc" },
                include: {
                  subTopics: {
                    where: activeCondition,
                    orderBy: { orderIndex: "asc" },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  let totalLevels = levels.length;
  let totalSubjects = 0;
  let totalChapters = 0;
  let totalTopics = 0;

  const tree: ITaxonomyLevelNode[] = levels.map((level) => {
    let levelChapterCount = 0;
    let levelTopicCount = 0;

    const subjects = level.subjects.map((subject) => {
      totalSubjects++;
      let subjectTopicCount = 0;

      const chapters = subject.chapters.map((chapter) => {
        totalChapters++;
        levelChapterCount++;

        const topics: ITaxonomyTopicNode[] = chapter.topics.map((topic) => {
          totalTopics++;
          subjectTopicCount++;
          levelTopicCount++;

          const subTopics: ITaxonomyTopicNode[] = topic.subTopics.map((subTopic) => {
            totalTopics++;
            subjectTopicCount++;
            levelTopicCount++;

            return {
              id: subTopic.id,
              topicNumber: subTopic.topicNumber,
              name: subTopic.name,
              slug: subTopic.slug,
              description: subTopic.description,
              learningObjectives: subTopic.learningObjectives,
              importanceLevel: subTopic.importanceLevel,
              difficultyLevel: subTopic.difficultyLevel,
              orderIndex: subTopic.orderIndex,
              isActive: subTopic.isActive,
              isPublished: subTopic.isPublished,
            };
          });

          return {
            id: topic.id,
            topicNumber: topic.topicNumber,
            name: topic.name,
            slug: topic.slug,
            description: topic.description,
            learningObjectives: topic.learningObjectives,
            importanceLevel: topic.importanceLevel,
            difficultyLevel: topic.difficultyLevel,
            orderIndex: topic.orderIndex,
            isActive: topic.isActive,
            isPublished: topic.isPublished,
            subTopics,
          };
        });

        return {
          id: chapter.id,
          chapterNumber: chapter.chapterNumber,
          name: chapter.name,
          slug: chapter.slug,
          description: chapter.description,
          totalEstimatedHours: chapter.totalEstimatedHours,
          weightage: chapter.weightage,
          orderIndex: chapter.orderIndex,
          isActive: chapter.isActive,
          isPublished: chapter.isPublished,
          topicCount: topics.length,
          topics,
        };
      });

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        slug: subject.slug,
        description: subject.description,
        icon: subject.icon,
        color: subject.color,
        paper: subject.paper,
        subjectCode: subject.subjectCode,
        orderIndex: subject.orderIndex,
        isActive: subject.isActive,
        isPublished: subject.isPublished,
        chapterCount: chapters.length,
        topicCount: subjectTopicCount,
        chapters,
      };
    });

    return {
      id: level.id,
      name: level.name,
      code: level.code,
      slug: level.slug,
      description: level.description,
      icon: level.icon,
      color: level.color,
      orderIndex: level.orderIndex,
      isActive: level.isActive,
      isPublished: level.isPublished,
      subjectCount: subjects.length,
      chapterCount: levelChapterCount,
      topicCount: levelTopicCount,
      subjects,
    };
  });

  return {
    tree,
    meta: {
      totalLevels,
      totalSubjects,
      totalChapters,
      totalTopics,
    },
  };
}

/**
 * Resolves the full breadcrumb lineage from a given Topic back to its parent Chapter, Subject, and Level.
 *
 * @param topicId - Topic UUID
 * @returns Structured lineage path
 * @throws {ApiError} 404 If topic not found
 */
export async function getTopicLineage(topicId: string): Promise<ITopicLineage> {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      parentTopic: {
        select: { id: true, name: true, slug: true },
      },
      chapter: {
        select: {
          id: true,
          name: true,
          chapterNumber: true,
          slug: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              slug: true,
              educationLevel: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!topic) {
    throw new ApiError(404, "Topic not found");
  }

  return {
    level: topic.chapter.subject.educationLevel,
    subject: {
      id: topic.chapter.subject.id,
      name: topic.chapter.subject.name,
      code: topic.chapter.subject.code,
      slug: topic.chapter.subject.slug,
    },
    chapter: {
      id: topic.chapter.id,
      name: topic.chapter.name,
      chapterNumber: topic.chapter.chapterNumber,
      slug: topic.chapter.slug,
    },
    topic: {
      id: topic.id,
      name: topic.name,
      topicNumber: topic.topicNumber,
      slug: topic.slug,
    },
    parentTopic: topic.parentTopic,
  };
}

/**
 * Computes aggregated statistics of the Curriculum Taxonomy.
 *
 * @returns Aggregated statistics counts and distributions
 */
export async function getTaxonomyStats(): Promise<ITaxonomyStats> {
  const [
    totalLevels,
    activeLevels,
    totalSubjects,
    activeSubjects,
    totalChapters,
    activeChapters,
    totalTopics,
    activeTopics,
    publishedTopics,
    importanceGroups,
    difficultyGroups,
  ] = await Promise.all([
    prisma.educationLevel.count(),
    prisma.educationLevel.count({ where: { isActive: true } }),
    prisma.subject.count(),
    prisma.subject.count({ where: { isActive: true } }),
    prisma.chapter.count(),
    prisma.chapter.count({ where: { isActive: true } }),
    prisma.topic.count(),
    prisma.topic.count({ where: { isActive: true } }),
    prisma.topic.count({ where: { isPublished: true } }),
    prisma.topic.groupBy({
      by: ["importanceLevel"],
      _count: { id: true },
    }),
    prisma.topic.groupBy({
      by: ["difficultyLevel"],
      _count: { id: true },
    }),
  ]);

  const importanceBreakdown: Record<string, number> = {};
  for (const group of importanceGroups) {
    importanceBreakdown[group.importanceLevel] = group._count.id;
  }

  const difficultyBreakdown: Record<string, number> = {};
  for (const group of difficultyGroups) {
    difficultyBreakdown[group.difficultyLevel] = group._count.id;
  }

  return {
    totalLevels,
    activeLevels,
    totalSubjects,
    activeSubjects,
    totalChapters,
    activeChapters,
    totalTopics,
    activeTopics,
    publishedTopics,
    importanceBreakdown,
    difficultyBreakdown,
  };
}

export const TaxonomyTreeService = {
  getFullTaxonomyTree,
  getTopicLineage,
  getTaxonomyStats,
};
