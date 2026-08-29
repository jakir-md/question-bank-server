/**
 * @file question-tag.service.ts
 * @description Business logic for Question Tagging & Multi-Tag Filter Queries (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { Prisma, Question, QuestionTag, Tag, TagCategory } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import {
  IAttachTagsToQuestionDTO,
  ICreateQuestionDTO,
  IQuestionFilterByTagsDTO,
} from "./tag.interface";
import { calculatePagination, getDefaultCategoryColor, getDefaultCategoryIcon, slugify } from "./tag.utils";

/**
 * Attaches and synchronizes metadata tags to a question.
 * Atomically updates denormalized `usageCount` on the affected Tag models.
 *
 * @param questionId - UUID of the question
 * @param payload - Tag IDs or names to attach
 * @returns Array of associated QuestionTag records with tag details
 */
export async function attachTagsToQuestion(
  questionId: string,
  payload: IAttachTagsToQuestionDTO,
): Promise<(QuestionTag & { tag: Tag })[]> {
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  const targetTagIds: string[] = [...(payload.tagIds || [])];

  // Resolve or create tags from tagNames if provided
  if (payload.tagNames && payload.tagNames.length > 0) {
    for (const name of payload.tagNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const slug = slugify(trimmed);

      let tag = await prisma.tag.findFirst({
        where: {
          OR: [
            { slug },
            { name: { equals: trimmed, mode: "insensitive" } },
          ],
        },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: trimmed,
            slug,
            category: TagCategory.CUSTOM,
            color: getDefaultCategoryColor(TagCategory.CUSTOM),
            icon: getDefaultCategoryIcon(TagCategory.CUSTOM),
            isActive: true,
          },
        });
      }

      if (!targetTagIds.includes(tag.id)) {
        targetTagIds.push(tag.id);
      }
    }
  }

  // Transaction to update relations and atomic usage counts
  return prisma.$transaction(async (tx) => {
    const existingRelations = await tx.questionTag.findMany({
      where: { questionId },
      select: { tagId: true },
    });

    const existingTagIds = existingRelations.map((r) => r.tagId);

    if (payload.replaceExisting !== false) {
      // Tags to remove: in existing but not in target
      const tagsToRemove = existingTagIds.filter((id) => !targetTagIds.includes(id));
      // Tags to add: in target but not in existing
      const tagsToAdd = targetTagIds.filter((id) => !existingTagIds.includes(id));

      if (tagsToRemove.length > 0) {
        await tx.questionTag.deleteMany({
          where: {
            questionId,
            tagId: { in: tagsToRemove },
          },
        });

        // Decrement usage counts
        await tx.tag.updateMany({
          where: { id: { in: tagsToRemove } },
          data: { usageCount: { decrement: 1 } },
        });
      }

      if (tagsToAdd.length > 0) {
        await tx.questionTag.createMany({
          data: tagsToAdd.map((tagId) => ({ questionId, tagId })),
          skipDuplicates: true,
        });

        // Increment usage counts
        await tx.tag.updateMany({
          where: { id: { in: tagsToAdd } },
          data: { usageCount: { increment: 1 } },
        });
      }
    } else {
      // Append mode: only add new tags
      const tagsToAdd = targetTagIds.filter((id) => !existingTagIds.includes(id));
      if (tagsToAdd.length > 0) {
        await tx.questionTag.createMany({
          data: tagsToAdd.map((tagId) => ({ questionId, tagId })),
          skipDuplicates: true,
        });

        await tx.tag.updateMany({
          where: { id: { in: tagsToAdd } },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    return tx.questionTag.findMany({
      where: { questionId },
      include: { tag: true },
    });
  });
}

/**
 * Creates a Question and attaches custom tags in a single workflow.
 *
 * @param payload - Question creation data with tags
 * @returns Created Question with attached tags & taxonomy details
 */
export async function createQuestionWithTags(payload: ICreateQuestionDTO): Promise<
  Question & {
    tags: { tag: Tag }[];
    educationLevel?: { id: string; name: string } | null;
    subject?: { id: string; name: string } | null;
    chapter?: { id: string; name: string } | null;
    topic?: { id: string; name: string } | null;
  }
> {
  const resolvedTagIds: string[] = [...(payload.tagIds || [])];

  if (payload.tagNames && payload.tagNames.length > 0) {
    for (const name of payload.tagNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const slug = slugify(trimmed);

      let tag = await prisma.tag.findFirst({
        where: {
          OR: [{ slug }, { name: { equals: trimmed, mode: "insensitive" } }],
        },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: trimmed,
            slug,
            category: TagCategory.CUSTOM,
            color: getDefaultCategoryColor(TagCategory.CUSTOM),
            icon: getDefaultCategoryIcon(TagCategory.CUSTOM),
            isActive: true,
          },
        });
      }

      if (!resolvedTagIds.includes(tag.id)) {
        resolvedTagIds.push(tag.id);
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        educationLevelId: payload.educationLevelId ?? null,
        subjectId: payload.subjectId ?? null,
        chapterId: payload.chapterId ?? null,
        topicId: payload.topicId ?? null,
        questionText: payload.questionText.trim(),
        questionType: payload.questionType ?? "MCQ",
        options: payload.options ? (payload.options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
        correctAnswer: payload.correctAnswer ?? null,
        explanation: payload.explanation?.trim() ?? null,
        difficulty: payload.difficulty ?? "MEDIUM",
        marks: payload.marks ?? 1.0,
        negativeMarks: payload.negativeMarks ?? 0.25,
        isActive: payload.isActive ?? true,
        isPublished: payload.isPublished ?? true,
      },
    });

    if (resolvedTagIds.length > 0) {
      await tx.questionTag.createMany({
        data: resolvedTagIds.map((tagId) => ({ questionId: question.id, tagId })),
      });

      await tx.tag.updateMany({
        where: { id: { in: resolvedTagIds } },
        data: { usageCount: { increment: 1 } },
      });
    }

    return tx.question.findUniqueOrThrow({
      where: { id: question.id },
      include: {
        tags: { include: { tag: true } },
        educationLevel: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
    });
  });
}

/**
 * Retrieves all tags attached to a specific Question.
 *
 * @param questionId - UUID of the question
 * @returns Array of Tag objects attached to the question
 */
export async function getQuestionTags(questionId: string): Promise<Tag[]> {
  const associations = await prisma.questionTag.findMany({
    where: { questionId },
    include: { tag: true },
  });

  return associations.map((a) => a.tag);
}

/**
 * High-performance query to filter questions by multiple custom tags and curriculum taxonomy.
 * Supports logical AND (must match all tags) and OR (matches any tag) filtering.
 *
 * @param filters - Filtering parameters
 * @returns Paginated question list with attached tags
 */
export async function filterQuestionsByTags(filters: IQuestionFilterByTagsDTO): Promise<{
  data: (Question & {
    tags: { tag: Tag }[];
    educationLevel?: { id: string; name: string } | null;
    subject?: { id: string; name: string } | null;
    chapter?: { id: string; name: string } | null;
    topic?: { id: string; name: string } | null;
  })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.QuestionWhereInput = {};

  if (filters.search) {
    where.questionText = { contains: filters.search, mode: "insensitive" };
  }

  if (filters.educationLevelId) where.educationLevelId = filters.educationLevelId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.chapterId) where.chapterId = filters.chapterId;
  if (filters.topicId) where.topicId = filters.topicId;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.questionType) where.questionType = filters.questionType;
  if (typeof filters.isActive === "boolean") where.isActive = filters.isActive;
  if (typeof filters.isPublished === "boolean") where.isPublished = filters.isPublished;

  // Tag filtering logic
  if (filters.tags && filters.tags.length > 0) {
    const rawTags = filters.tags.map((t) => t.trim()).filter(Boolean);

    // Resolve tag IDs (could be slugs or UUIDs)
    const matchingTags = await prisma.tag.findMany({
      where: {
        OR: [
          { id: { in: rawTags } },
          { slug: { in: rawTags } },
          { name: { in: rawTags, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });

    const tagIds = matchingTags.map((t) => t.id);

    if (tagIds.length === 0) {
      return {
        data: [],
        meta: { page, limit, total: 0, totalPages: 0 },
      };
    }

    if (filters.operator === "AND") {
      // Question must have all specified tags
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        ...tagIds.map((tagId) => ({
          tags: {
            some: { tagId },
          },
        })),
      ];
    } else {
      // Question has at least one matching tag
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }
  }

  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";

  const [total, data] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        tags: {
          include: { tag: true },
        },
        educationLevel: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export const QuestionTagService = {
  attachTagsToQuestion,
  createQuestionWithTags,
  getQuestionTags,
  filterQuestionsByTags,
};
