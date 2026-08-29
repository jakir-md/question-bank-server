/**
 * @file mcq-ingestion.service.ts
 * @description Business logic layer for MCQ Ingestion (Single & Multi-Context) (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { Prisma, Question, QuestionContext, Tag, TagCategory } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import {
  ICreateMultiContextMCQDTO,
  ICreateSingleMCQDTO,
  IMCQFilterDTO,
  IMCQStatsResponse,
  IQuestionContextFilterDTO,
  IUpdateMCQDTO,
  IUpdateQuestionContextDTO,
} from "./mcq-ingestion.interface";
import { calculatePagination, getDefaultCategoryColor, getDefaultCategoryIcon, slugify } from "../metadata-tagging/tag.utils";

/**
 * Resolves a list of tag IDs and/or tag names to persisted Tag IDs.
 * Creates new CUSTOM tags on-the-fly for unmatched tag names.
 *
 * @param tagIds - Optional array of existing UUIDs
 * @param tagNames - Optional array of tag names (e.g. "Dhaka Board 2024")
 * @returns Array of unique resolved Tag UUIDs
 */
async function resolveTagIds(tagIds?: string[], tagNames?: string[]): Promise<string[]> {
  const resolvedIds: string[] = [...(tagIds || [])];

  if (tagNames && tagNames.length > 0) {
    for (const name of tagNames) {
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

      if (!resolvedIds.includes(tag.id)) {
        resolvedIds.push(tag.id);
      }
    }
  }

  return Array.from(new Set(resolvedIds));
}

/**
 * Ingests a single standalone MCQ item with options, validation, taxonomy, and tags.
 *
 * @param payload - Validated Single MCQ Ingestion DTO
 * @returns Persisted Question record with relations
 */
export async function ingestSingleMCQ(payload: ICreateSingleMCQDTO): Promise<any> {
  // Synchronize correct answer key
  const correctOption = payload.options.find((opt) => opt.isCorrect);
  const correctAnswerKey = payload.correctAnswer || correctOption?.id || "A";

  const resolvedTags = await resolveTagIds(payload.tagIds, payload.tagNames);

  return prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        educationLevelId: payload.educationLevelId ?? null,
        subjectId: payload.subjectId ?? null,
        chapterId: payload.chapterId ?? null,
        topicId: payload.topicId ?? null,
        contextId: payload.contextId ?? null,
        contextOrder: payload.contextOrder ?? 0,
        questionText: payload.questionText.trim(),
        questionType: payload.questionType ?? "MCQ",
        options: payload.options as unknown as Prisma.InputJsonValue,
        correctAnswer: correctAnswerKey,
        explanation: payload.explanation?.trim() ?? null,
        difficulty: payload.difficulty ?? "MEDIUM",
        marks: payload.marks ?? 1.0,
        negativeMarks: payload.negativeMarks ?? 0.25,
        isActive: payload.isActive ?? true,
        isPublished: payload.isPublished ?? true,
      },
    });

    if (resolvedTags.length > 0) {
      await tx.questionTag.createMany({
        data: resolvedTags.map((tagId) => ({ questionId: question.id, tagId })),
        skipDuplicates: true,
      });

      await tx.tag.updateMany({
        where: { id: { in: resolvedTags } },
        data: { usageCount: { increment: 1 } },
      });
    }

    return tx.question.findUniqueOrThrow({
      where: { id: question.id },
      include: {
        tags: { include: { tag: true } },
        educationLevel: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        chapter: { select: { id: true, name: true, chapterNumber: true } },
        topic: { select: { id: true, name: true } },
        context: true,
      },
    });
  });
}

/**
 * Ingests a Multi-Context Question Package (Passage/Stem + Array of Sub-Questions) in an atomic transaction.
 *
 * @param payload - Validated Multi-Context MCQ Ingestion DTO
 * @returns Persisted QuestionContext with all nested sub-questions, taxonomy, and tags
 */
export async function ingestMultiContextMCQ(payload: ICreateMultiContextMCQDTO): Promise<any> {
  const { context, questions, commonTagIds, commonTagNames } = payload;

  const resolvedCommonTags = await resolveTagIds(commonTagIds, commonTagNames);

  return prisma.$transaction(async (tx) => {
    // 1. Create QuestionContext
    const createdContext = await tx.questionContext.create({
      data: {
        title: context.title?.trim() || null,
        contextText: context.contextText.trim(),
        contextType: context.contextType ?? "PASSAGE",
        mediaUrl: context.mediaUrl?.trim() || null,
        educationLevelId: context.educationLevelId ?? null,
        subjectId: context.subjectId ?? null,
        chapterId: context.chapterId ?? null,
        topicId: context.topicId ?? null,
        isActive: context.isActive ?? true,
        isPublished: context.isPublished ?? true,
      },
    });

    // 2. Create each sub-question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const correctOption = q.options.find((opt) => opt.isCorrect);
      const correctAnswerKey = q.correctAnswer || correctOption?.id || "A";

      // Inherit taxonomy from context if not explicitly overridden
      const educationLevelId = context.educationLevelId ?? null;
      const subjectId = context.subjectId ?? null;
      const chapterId = context.chapterId ?? null;
      const topicId = q.topicId ?? context.topicId ?? null;

      const questionRecord = await tx.question.create({
        data: {
          educationLevelId,
          subjectId,
          chapterId,
          topicId,
          contextId: createdContext.id,
          contextOrder: q.order ?? i + 1,
          questionText: q.questionText.trim(),
          questionType: q.questionType ?? "MCQ",
          options: q.options as unknown as Prisma.InputJsonValue,
          correctAnswer: correctAnswerKey,
          explanation: q.explanation?.trim() ?? null,
          difficulty: q.difficulty ?? "MEDIUM",
          marks: q.marks ?? 1.0,
          negativeMarks: q.negativeMarks ?? 0.25,
          isActive: true,
          isPublished: true,
        },
      });

      // Resolve sub-question tags (inherit common tags + question-specific tags)
      const qTagIds = await resolveTagIds(q.tagIds, q.tagNames);
      const combinedTagIds = Array.from(new Set([...resolvedCommonTags, ...qTagIds]));

      if (combinedTagIds.length > 0) {
        await tx.questionTag.createMany({
          data: combinedTagIds.map((tagId) => ({ questionId: questionRecord.id, tagId })),
          skipDuplicates: true,
        });

        await tx.tag.updateMany({
          where: { id: { in: combinedTagIds } },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    // 3. Return full context with nested questions and tags
    return tx.questionContext.findUniqueOrThrow({
      where: { id: createdContext.id },
      include: {
        educationLevel: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        questions: {
          orderBy: { contextOrder: "asc" },
          include: {
            tags: { include: { tag: true } },
            topic: { select: { id: true, name: true } },
          },
        },
      },
    });
  });
}

/**
 * Retrieves paginated questions with rich filters (search, taxonomy, tags, difficulty, single vs multi-context).
 *
 * @param filters - Filter options
 * @returns Paginated questions list and metadata
 */
export async function getMCQs(filters: IMCQFilterDTO): Promise<{
  data: any[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.QuestionWhereInput = {};

  if (filters.search) {
    where.OR = [
      { questionText: { contains: filters.search, mode: "insensitive" } },
      { explanation: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.educationLevelId) where.educationLevelId = filters.educationLevelId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.chapterId) where.chapterId = filters.chapterId;
  if (filters.topicId) where.topicId = filters.topicId;
  if (filters.difficulty) where.difficulty = filters.difficulty;
  if (filters.questionType) where.questionType = filters.questionType;
  if (typeof filters.isActive === "boolean") where.isActive = filters.isActive;
  if (typeof filters.isPublished === "boolean") where.isPublished = filters.isPublished;

  // Single vs Multi-Context filtering
  if (filters.contextId) {
    where.contextId = filters.contextId;
  } else if (filters.isMultiContext === true) {
    where.contextId = { not: null };
  } else if (filters.isMultiContext === false) {
    where.contextId = null;
  }

  // Tag filter logic
  if (filters.tags && filters.tags.length > 0) {
    const rawTags = filters.tags.map((t) => t.trim()).filter(Boolean);

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
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        ...tagIds.map((tagId) => ({
          tags: { some: { tagId } },
        })),
      ];
    } else {
      where.tags = {
        some: { tagId: { in: tagIds } },
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
        tags: { include: { tag: true } },
        educationLevel: { select: { id: true, name: true, code: true } },
        subject: { select: { id: true, name: true, code: true } },
        chapter: { select: { id: true, name: true, chapterNumber: true } },
        topic: { select: { id: true, name: true } },
        context: {
          select: {
            id: true,
            title: true,
            contextText: true,
            contextType: true,
          },
        },
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

/**
 * Retrieves a single MCQ by its UUID with all associations.
 *
 * @param id - Question UUID
 * @returns Question details
 */
export async function getMCQById(id: string): Promise<any> {
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      tags: { include: { tag: true } },
      educationLevel: { select: { id: true, name: true, code: true } },
      subject: { select: { id: true, name: true, code: true } },
      chapter: { select: { id: true, name: true, chapterNumber: true } },
      topic: { select: { id: true, name: true } },
      context: true,
    },
  });

  if (!question) {
    throw new ApiError(404, "Question not found");
  }

  return question;
}

/**
 * Updates an existing MCQ item.
 *
 * @param id - Question UUID
 * @param payload - Update DTO
 * @returns Updated Question
 */
export async function updateMCQ(id: string, payload: IUpdateMCQDTO): Promise<any> {
  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Question not found");
  }

  let correctAnswer = payload.correctAnswer;
  if (payload.options) {
    const correctOpt = payload.options.find((o) => o.isCorrect);
    if (correctOpt) {
      correctAnswer = correctOpt.id;
    }
  }

  let tagIdsToSync: string[] | undefined;
  if (payload.tagIds || payload.tagNames) {
    tagIdsToSync = await resolveTagIds(payload.tagIds, payload.tagNames);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.question.update({
      where: { id },
      data: {
        questionText: payload.questionText?.trim(),
        questionType: payload.questionType,
        options: payload.options ? (payload.options as unknown as Prisma.InputJsonValue) : undefined,
        correctAnswer,
        explanation: payload.explanation !== undefined ? payload.explanation?.trim() || null : undefined,
        difficulty: payload.difficulty,
        marks: payload.marks,
        negativeMarks: payload.negativeMarks,
        educationLevelId: payload.educationLevelId,
        subjectId: payload.subjectId,
        chapterId: payload.chapterId,
        topicId: payload.topicId,
        contextId: payload.contextId,
        contextOrder: payload.contextOrder,
        isActive: payload.isActive,
        isPublished: payload.isPublished,
      },
    });

    if (tagIdsToSync !== undefined) {
      const currentRelations = await tx.questionTag.findMany({
        where: { questionId: id },
        select: { tagId: true },
      });
      const currentTagIds = currentRelations.map((r) => r.tagId);

      const toRemove = currentTagIds.filter((tId) => !tagIdsToSync!.includes(tId));
      const toAdd = tagIdsToSync.filter((tId) => !currentTagIds.includes(tId));

      if (toRemove.length > 0) {
        await tx.questionTag.deleteMany({
          where: { questionId: id, tagId: { in: toRemove } },
        });
        await tx.tag.updateMany({
          where: { id: { in: toRemove } },
          data: { usageCount: { decrement: 1 } },
        });
      }

      if (toAdd.length > 0) {
        await tx.questionTag.createMany({
          data: toAdd.map((tagId) => ({ questionId: id, tagId })),
          skipDuplicates: true,
        });
        await tx.tag.updateMany({
          where: { id: { in: toAdd } },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    return tx.question.findUniqueOrThrow({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        educationLevel: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        context: true,
      },
    });
  });
}

/**
 * Deletes an MCQ item and decrements attached tag usage counts.
 *
 * @param id - Question UUID
 * @returns Deleted Question
 */
export async function deleteMCQ(id: string): Promise<Question> {
  const existing = await prisma.question.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!existing) {
    throw new ApiError(404, "Question not found");
  }

  const tagIds = existing.tags.map((t) => t.tagId);

  return prisma.$transaction(async (tx) => {
    const deleted = await tx.question.delete({ where: { id } });

    if (tagIds.length > 0) {
      await tx.tag.updateMany({
        where: { id: { in: tagIds } },
        data: { usageCount: { decrement: 1 } },
      });
    }

    return deleted;
  });
}

/**
 * Lists all Question Contexts (Passages/Stems) with filters and sub-question count.
 *
 * @param filters - Query filters
 * @returns Paginated contexts
 */
export async function getQuestionContexts(filters: IQuestionContextFilterDTO): Promise<{
  data: any[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.QuestionContextWhereInput = {};

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { contextText: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.educationLevelId) where.educationLevelId = filters.educationLevelId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.chapterId) where.chapterId = filters.chapterId;
  if (filters.topicId) where.topicId = filters.topicId;
  if (filters.contextType) where.contextType = filters.contextType;
  if (typeof filters.isActive === "boolean") where.isActive = filters.isActive;
  if (typeof filters.isPublished === "boolean") where.isPublished = filters.isPublished;

  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";

  const [total, data] = await Promise.all([
    prisma.questionContext.count({ where }),
    prisma.questionContext.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        educationLevel: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
        _count: { select: { questions: true } },
        questions: {
          orderBy: { contextOrder: "asc" },
          select: {
            id: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            difficulty: true,
            marks: true,
          },
        },
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

/**
 * Retrieves a single Question Context by ID with all its questions.
 *
 * @param id - QuestionContext UUID
 * @returns Context with full question details
 */
export async function getQuestionContextById(id: string): Promise<any> {
  const context = await prisma.questionContext.findUnique({
    where: { id },
    include: {
      educationLevel: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      chapter: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      questions: {
        orderBy: { contextOrder: "asc" },
        include: {
          tags: { include: { tag: true } },
          topic: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!context) {
    throw new ApiError(404, "Question context not found");
  }

  return context;
}

/**
 * Updates a Question Context (Passage/Stem).
 *
 * @param id - Context UUID
 * @param payload - Update DTO
 * @returns Updated context
 */
export async function updateQuestionContext(id: string, payload: IUpdateQuestionContextDTO): Promise<QuestionContext> {
  const existing = await prisma.questionContext.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Question context not found");
  }

  return prisma.questionContext.update({
    where: { id },
    data: {
      title: payload.title !== undefined ? payload.title?.trim() || null : undefined,
      contextText: payload.contextText?.trim(),
      contextType: payload.contextType,
      mediaUrl: payload.mediaUrl !== undefined ? payload.mediaUrl?.trim() || null : undefined,
      educationLevelId: payload.educationLevelId,
      subjectId: payload.subjectId,
      chapterId: payload.chapterId,
      topicId: payload.topicId,
      isActive: payload.isActive,
      isPublished: payload.isPublished,
    },
    include: {
      educationLevel: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      chapter: { select: { id: true, name: true } },
      topic: { select: { id: true, name: true } },
      questions: true,
    },
  });
}

/**
 * Deletes a Question Context and cascades to its sub-questions.
 *
 * @param id - Context UUID
 * @returns Deleted context
 */
export async function deleteQuestionContext(id: string): Promise<QuestionContext> {
  const existing = await prisma.questionContext.findUnique({
    where: { id },
    include: { questions: { select: { id: true } } },
  });

  if (!existing) {
    throw new ApiError(404, "Question context not found");
  }

  return prisma.questionContext.delete({ where: { id } });
}

/**
 * Aggregates summary statistics for MCQ Ingestion (Total, Single vs Multi-Context, Difficulty, Contexts).
 *
 * @returns Analytics breakdown
 */
export async function getMCQStats(): Promise<IMCQStatsResponse> {
  const [
    totalQuestions,
    totalSingleMCQs,
    totalMultiContextMCQs,
    totalContexts,
    easyCount,
    mediumCount,
    hardCount,
    totalActive,
    totalPublished,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { contextId: null } }),
    prisma.question.count({ where: { contextId: { not: null } } }),
    prisma.questionContext.count(),
    prisma.question.count({ where: { difficulty: "EASY" } }),
    prisma.question.count({ where: { difficulty: "MEDIUM" } }),
    prisma.question.count({ where: { difficulty: "HARD" } }),
    prisma.question.count({ where: { isActive: true } }),
    prisma.question.count({ where: { isPublished: true } }),
  ]);

  return {
    totalQuestions,
    totalSingleMCQs,
    totalMultiContextMCQs,
    totalContexts,
    difficultyDistribution: {
      EASY: easyCount,
      MEDIUM: mediumCount,
      HARD: hardCount,
    },
    totalActive,
    totalPublished,
  };
}

export const MCQIngestionService = {
  ingestSingleMCQ,
  ingestMultiContextMCQ,
  getMCQs,
  getMCQById,
  updateMCQ,
  deleteMCQ,
  getQuestionContexts,
  getQuestionContextById,
  updateQuestionContext,
  deleteQuestionContext,
  getMCQStats,
};
