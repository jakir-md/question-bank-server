/**
 * @file cq-ingestion.service.ts
 * @description Business logic and database operations for Creative Question (CQ) Ingestion (MVC - Service/Model).
 * Handles atomic ingestion of Uddipok (stem) and exactly 4 structured sub-questions (ক, খ, গ, ঘ),
 * total marks validation, taxonomy linkage, metadata tagging, search & filter queries, and stats.
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { Prisma, Question, QuestionContext, Tag, TagCategory } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import {
  CQSubQuestionKey,
  CQSubQuestionLabel,
  ICQFilterDTO,
  ICQStatsResponse,
  ICQSubQuestionInput,
  ICreateCQDTO,
  IUpdateCQDTO,
} from "./cq-ingestion.interface";
import { calculatePagination, getDefaultCategoryColor, getDefaultCategoryIcon, slugify } from "../metadata-tagging/tag.utils";

/**
 * Resolves a list of tag IDs and/or tag names to persisted Tag IDs.
 * Creates new CUSTOM tags on-the-fly for unmatched tag names.
 *
 * @param tagIds - Optional array of existing UUIDs
 * @param tagNames - Optional array of tag names (e.g. "Dhaka Board 2024")
 * @returns Array of unique resolved Tag UUIDs
 */
export async function resolveTagIds(tagIds?: string[], tagNames?: string[]): Promise<string[]> {
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
 * Maps Bengali sub-question label to integer context order.
 */
function mapLabelToOrder(label: CQSubQuestionLabel): number {
  switch (label) {
    case "ক":
      return 1;
    case "খ":
      return 2;
    case "গ":
      return 3;
    case "ঘ":
      return 4;
    default:
      return 1;
  }
}

/**
 * Ingests a complete Creative Question (CQ) package atomically (Uddipok Stimulus + 4 Sub-questions).
 *
 * @param payload - Validated CQ Creation DTO
 * @returns Persisted QuestionContext record with nested CQ sub-questions and taxonomy relations
 */
export async function ingestCQ(payload: ICreateCQDTO): Promise<any> {
  const { stimulus, questions, commonTagIds, commonTagNames, totalMarks = 10.0 } = payload;

  // Resolve common metadata tags
  const resolvedCommonTagIds = await resolveTagIds(commonTagIds, commonTagNames);

  return prisma.$transaction(async (tx) => {
    // 1. Create the Uddipok (QuestionContext)
    const context = await tx.questionContext.create({
      data: {
        title: stimulus.title?.trim() ?? null,
        contextText: stimulus.contextText.trim(),
        contextType: stimulus.contextType ?? "STEM",
        mediaUrl: stimulus.mediaUrl?.trim() || null,
        educationLevelId: stimulus.educationLevelId ?? null,
        subjectId: stimulus.subjectId ?? null,
        chapterId: stimulus.chapterId ?? null,
        topicId: stimulus.topicId ?? null,
        isActive: stimulus.isActive ?? true,
        isPublished: stimulus.isPublished ?? true,
      },
    });

    const createdQuestions: Question[] = [];

    // 2. Persist each of the 4 sub-questions (ক, খ, গ, ঘ)
    for (let index = 0; index < questions.length; index++) {
      const q = questions[index];
      const order = q.order ?? mapLabelToOrder(q.label);

      // Resolve individual sub-question tags combined with common tags
      const subTagIds = await resolveTagIds(q.tagIds, q.tagNames);
      const combinedTagIds = Array.from(new Set([...resolvedCommonTagIds, ...subTagIds]));

      // Store cognitive metadata in options JSON
      const cqMeta = {
        label: q.label,
        cognitiveLevel: q.cognitiveLevel,
        totalCQMarks: totalMarks,
      };

      const questionRecord = await tx.question.create({
        data: {
          educationLevelId: stimulus.educationLevelId ?? null,
          subjectId: stimulus.subjectId ?? null,
          chapterId: stimulus.chapterId ?? null,
          topicId: q.topicId ?? stimulus.topicId ?? null,
          contextId: context.id,
          contextOrder: order,
          questionText: q.questionText.trim(),
          questionType: "CQ",
          options: cqMeta as unknown as Prisma.InputJsonValue,
          correctAnswer: null,
          explanation: q.explanation?.trim() ?? null,
          difficulty: q.difficulty ?? "MEDIUM",
          marks: q.marks,
          negativeMarks: 0,
          isActive: stimulus.isActive ?? true,
          isPublished: stimulus.isPublished ?? true,
        },
      });

      // Link tags to sub-question
      if (combinedTagIds.length > 0) {
        await tx.questionTag.createMany({
          data: combinedTagIds.map((tagId) => ({
            questionId: questionRecord.id,
            tagId,
          })),
          skipDuplicates: true,
        });

        // Increment tag usage counter
        await tx.tag.updateMany({
          where: { id: { in: combinedTagIds } },
          data: { usageCount: { increment: 1 } },
        });
      }

      createdQuestions.push(questionRecord);
    }

    // 3. Return full aggregated CQ entity
    return tx.questionContext.findUnique({
      where: { id: context.id },
      include: {
        educationLevel: true,
        subject: true,
        chapter: true,
        topic: true,
        questions: {
          orderBy: { contextOrder: "asc" },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });
  });
}

/**
 * Queries and filters paginated Creative Questions.
 *
 * @param filters - CQ filter parameters
 * @returns Paginated list of CQ contexts with nested sub-questions
 */
export async function getCQs(filters: ICQFilterDTO): Promise<{ data: any[]; meta: any }> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";

  const andConditions: Prisma.QuestionContextWhereInput[] = [];

  // Enforce that we only query contexts that contain CQ questions
  andConditions.push({
    questions: {
      some: {
        questionType: "CQ",
      },
    },
  });

  // Search in Uddipok contextText, title, or sub-questions text
  if (filters.search && filters.search.trim()) {
    const searchVal = filters.search.trim();
    andConditions.push({
      OR: [
        { title: { contains: searchVal, mode: "insensitive" } },
        { contextText: { contains: searchVal, mode: "insensitive" } },
        {
          questions: {
            some: {
              questionText: { contains: searchVal, mode: "insensitive" },
            },
          },
        },
      ],
    });
  }

  // Taxonomy Filters
  if (filters.educationLevelId) {
    andConditions.push({ educationLevelId: filters.educationLevelId });
  }
  if (filters.subjectId) {
    andConditions.push({ subjectId: filters.subjectId });
  }
  if (filters.chapterId) {
    andConditions.push({ chapterId: filters.chapterId });
  }
  if (filters.topicId) {
    andConditions.push({ topicId: filters.topicId });
  }

  // Difficulty Filter
  if (filters.difficulty) {
    andConditions.push({
      questions: {
        some: {
          difficulty: filters.difficulty,
          questionType: "CQ",
        },
      },
    });
  }

  // Tags Filter
  if (filters.tags && filters.tags.length > 0) {
    if (filters.operator === "OR") {
      andConditions.push({
        questions: {
          some: {
            tags: {
              some: {
                OR: [
                  { tagId: { in: filters.tags } },
                  { tag: { name: { in: filters.tags, mode: "insensitive" } } },
                  { tag: { slug: { in: filters.tags } } },
                ],
              },
            },
          },
        },
      });
    } else {
      // AND operator: questions must match all tags
      for (const tagIdent of filters.tags) {
        andConditions.push({
          questions: {
            some: {
              tags: {
                some: {
                  OR: [
                    { tagId: tagIdent },
                    { tag: { name: { equals: tagIdent, mode: "insensitive" } } },
                    { tag: { slug: tagIdent } },
                  ],
                },
              },
            },
          },
        });
      }
    }
  }

  if (filters.isActive !== undefined) {
    andConditions.push({ isActive: filters.isActive });
  }
  if (filters.isPublished !== undefined) {
    andConditions.push({ isPublished: filters.isPublished });
  }

  const where: Prisma.QuestionContextWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [total, contexts] = await Promise.all([
    prisma.questionContext.count({ where }),
    prisma.questionContext.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        educationLevel: true,
        subject: true,
        chapter: true,
        topic: true,
        questions: {
          where: { questionType: "CQ" },
          orderBy: { contextOrder: "asc" },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data: contexts,
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves a single Creative Question (CQ) by its Context UUID.
 *
 * @param id - QuestionContext ID
 * @returns Full CQ entity with Uddipok and 4 sub-questions
 */
export async function getCQById(id: string): Promise<any> {
  const cq = await prisma.questionContext.findUnique({
    where: { id },
    include: {
      educationLevel: true,
      subject: true,
      chapter: true,
      topic: true,
      questions: {
        where: { questionType: "CQ" },
        orderBy: { contextOrder: "asc" },
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      },
    },
  });

  if (!cq) {
    throw new ApiError(404, `Creative Question set with ID '${id}' not found`);
  }

  return cq;
}

/**
 * Updates an existing Creative Question (Uddipok and/or sub-questions).
 *
 * @param id - QuestionContext ID
 * @param payload - Partial update payload
 * @returns Updated CQ entity
 */
export async function updateCQ(id: string, payload: IUpdateCQDTO): Promise<any> {
  const existing = await prisma.questionContext.findUnique({
    where: { id },
    include: { questions: { where: { questionType: "CQ" } } },
  });

  if (!existing) {
    throw new ApiError(404, `Creative Question with ID '${id}' not found`);
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update Stimulus if provided
    if (payload.stimulus) {
      await tx.questionContext.update({
        where: { id },
        data: {
          title: payload.stimulus.title !== undefined ? payload.stimulus.title : undefined,
          contextText: payload.stimulus.contextText?.trim(),
          contextType: payload.stimulus.contextType,
          mediaUrl: payload.stimulus.mediaUrl !== undefined ? payload.stimulus.mediaUrl : undefined,
          educationLevelId: payload.stimulus.educationLevelId,
          subjectId: payload.stimulus.subjectId,
          chapterId: payload.stimulus.chapterId,
          topicId: payload.stimulus.topicId,
          isActive: payload.stimulus.isActive,
          isPublished: payload.stimulus.isPublished,
        },
      });
    }

    // 2. Update or replace sub-questions if provided
    if (payload.questions && payload.questions.length > 0) {
      for (const q of payload.questions) {
        const order = q.order ?? mapLabelToOrder(q.label);
        const existingSub = existing.questions.find((sub) => sub.contextOrder === order);

        const cqMeta = {
          label: q.label,
          cognitiveLevel: q.cognitiveLevel,
          totalCQMarks: payload.totalMarks ?? 10.0,
        };

        if (existingSub) {
          await tx.question.update({
            where: { id: existingSub.id },
            data: {
              questionText: q.questionText.trim(),
              marks: q.marks,
              explanation: q.explanation?.trim() ?? null,
              difficulty: q.difficulty,
              options: cqMeta as unknown as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    return tx.questionContext.findUnique({
      where: { id },
      include: {
        educationLevel: true,
        subject: true,
        chapter: true,
        topic: true,
        questions: {
          where: { questionType: "CQ" },
          orderBy: { contextOrder: "asc" },
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
    });
  });
}

/**
 * Deletes a Creative Question set and all its cascaded sub-questions.
 *
 * @param id - QuestionContext ID
 * @returns Confirmation message
 */
export async function deleteCQ(id: string): Promise<{ success: boolean; message: string }> {
  const existing = await prisma.questionContext.findUnique({
    where: { id },
    include: {
      questions: {
        where: { questionType: "CQ" },
        include: { tags: true },
      },
    },
  });

  if (!existing) {
    throw new ApiError(404, `Creative Question set with ID '${id}' not found`);
  }

  const allTagIds = existing.questions.flatMap((q) => q.tags.map((t) => t.tagId));

  await prisma.$transaction(async (tx) => {
    // Delete the context (cascades to questions & question_tags via foreign keys)
    await tx.questionContext.delete({
      where: { id },
    });

    // Decrement tag usage counts
    if (allTagIds.length > 0) {
      await tx.tag.updateMany({
        where: { id: { in: allTagIds }, usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
    }
  });

  return {
    success: true,
    message: `Creative Question set '${id}' and its 4 sub-questions deleted successfully`,
  };
}

/**
 * Aggregates summary statistics and cognitive breakdown for Creative Questions.
 *
 * @returns CQ statistics metrics
 */
export async function getCQStats(): Promise<ICQStatsResponse> {
  const [
    totalCQSets,
    totalSubQuestions,
    subQuestions,
    easyCount,
    mediumCount,
    hardCount,
    totalActive,
    totalPublished,
  ] = await Promise.all([
    prisma.questionContext.count({
      where: { questions: { some: { questionType: "CQ" } } },
    }),
    prisma.question.count({
      where: { questionType: "CQ" },
    }),
    prisma.question.findMany({
      where: { questionType: "CQ" },
      select: { contextOrder: true, marks: true },
    }),
    prisma.question.count({
      where: { questionType: "CQ", difficulty: "EASY" },
    }),
    prisma.question.count({
      where: { questionType: "CQ", difficulty: "MEDIUM" },
    }),
    prisma.question.count({
      where: { questionType: "CQ", difficulty: "HARD" },
    }),
    prisma.questionContext.count({
      where: { isActive: true, questions: { some: { questionType: "CQ" } } },
    }),
    prisma.questionContext.count({
      where: { isPublished: true, questions: { some: { questionType: "CQ" } } },
    }),
  ]);

  let knowledgeCount = 0;
  let comprehensionCount = 0;
  let applicationCount = 0;
  let higherAbilityCount = 0;
  let totalMarksLogged = 0;

  for (const q of subQuestions) {
    totalMarksLogged += q.marks || 0;
    if (q.contextOrder === 1) knowledgeCount++;
    else if (q.contextOrder === 2) comprehensionCount++;
    else if (q.contextOrder === 3) applicationCount++;
    else if (q.contextOrder === 4) higherAbilityCount++;
  }

  return {
    totalCQSets,
    totalSubQuestions,
    cognitiveDistribution: {
      KNOWLEDGE: knowledgeCount,
      COMPREHENSION: comprehensionCount,
      APPLICATION: applicationCount,
      HIGHER_ABILITY: higherAbilityCount,
    },
    difficultyDistribution: {
      EASY: easyCount,
      MEDIUM: mediumCount,
      HARD: hardCount,
    },
    totalMarksLogged,
    totalActive,
    totalPublished,
  };
}

export const CQIngestionService = {
  ingestCQ,
  getCQs,
  getCQById,
  updateCQ,
  deleteCQ,
  getCQStats,
  resolveTagIds,
};
