/**
 * @file chapter.service.ts
 * @description Business logic layer for Chapter taxonomy tier (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { Chapter, Prisma } from "@prisma/client";
import { prisma } from "../../../../shared/prisma";
import ApiError from "../../../error/ApiError";
import {
  IChapterFilterOptions,
  ICreateChapterDTO,
  IReorderTaxonomyItemDTO,
  IUpdateChapterDTO,
} from "../taxonomy.interface";
import { calculatePagination, slugify } from "../taxonomy.utils";

/**
 * Creates a new Chapter under a Subject.
 *
 * @param payload - Data transfer object containing Chapter properties
 * @returns The created Chapter entity
 * @throws {ApiError} 404 If parent Subject not found, 400 If duplicate slug in subject
 */
export async function createChapter(payload: ICreateChapterDTO): Promise<Chapter> {
  const subject = await prisma.subject.findUnique({
    where: { id: payload.subjectId },
  });

  if (!subject) {
    throw new ApiError(404, "Parent Subject not found");
  }

  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

  // Check unique slug within Subject
  const existingSlug = await prisma.chapter.findFirst({
    where: {
      subjectId: payload.subjectId,
      slug,
    },
  });

  if (existingSlug) {
    throw new ApiError(400, `Chapter with slug '${slug}' already exists in this Subject`);
  }

  // Calculate orderIndex if not specified
  let orderIndex = payload.orderIndex;
  if (orderIndex === undefined || orderIndex === null) {
    const highestOrder = await prisma.chapter.aggregate({
      where: { subjectId: payload.subjectId },
      _max: { orderIndex: true },
    });
    orderIndex = (highestOrder._max.orderIndex ?? -1) + 1;
  }

  return prisma.chapter.create({
    data: {
      subjectId: payload.subjectId,
      chapterNumber: payload.chapterNumber ?? null,
      name: payload.name.trim(),
      slug,
      description: payload.description?.trim() ?? null,
      totalEstimatedHours: payload.totalEstimatedHours ?? null,
      weightage: payload.weightage ?? null,
      orderIndex,
      isActive: payload.isActive ?? true,
      isPublished: payload.isPublished ?? false,
    },
  });
}

/**
 * Retrieves paginated list of Chapters with filters & search.
 *
 * @param filters - Query filters
 * @returns Paginated result list and metadata
 */
export async function getAllChapters(filters: IChapterFilterOptions): Promise<{
  data: (Chapter & {
    subject?: {
      id: string;
      name: string;
      code: string;
      educationLevel: { id: string; name: string; code: string };
    };
    _count?: { topics: number };
  })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.ChapterWhereInput = {};

  if (filters.subjectId) {
    where.subjectId = filters.subjectId;
  }

  if (filters.educationLevelId) {
    where.subject = { educationLevelId: filters.educationLevelId };
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (typeof filters.isActive === "boolean") {
    where.isActive = filters.isActive;
  }

  if (typeof filters.isPublished === "boolean") {
    where.isPublished = filters.isPublished;
  }

  const sortBy = filters.sortBy || "orderIndex";
  const sortOrder = filters.sortOrder || "asc";

  const [total, data] = await Promise.all([
    prisma.chapter.count({ where }),
    prisma.chapter.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            educationLevel: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        _count: {
          select: { topics: true },
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
 * Retrieves a single Chapter by ID with relations.
 *
 * @param id - Chapter UUID
 * @returns Chapter entity with parent subject and topics
 * @throws {ApiError} 404 If not found
 */
export async function getChapterById(id: string): Promise<
  Chapter & {
    subject: {
      id: string;
      name: string;
      code: string;
      educationLevel: { id: string; name: string; code: string };
    };
    topics: {
      id: string;
      name: string;
      topicNumber: string | null;
      importanceLevel: string;
      difficultyLevel: string;
    }[];
  }
> {
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          educationLevel: {
            select: { id: true, name: true, code: true },
          },
        },
      },
      topics: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          name: true,
          topicNumber: true,
          importanceLevel: true,
          difficultyLevel: true,
        },
      },
    },
  });

  if (!chapter) {
    throw new ApiError(404, "Chapter not found");
  }

  return chapter;
}

/**
 * Updates an existing Chapter.
 *
 * @param id - Chapter UUID
 * @param payload - Update DTO
 * @returns Updated Chapter entity
 * @throws {ApiError} 404 If not found or 400 If duplicate slug within subject
 */
export async function updateChapter(id: string, payload: IUpdateChapterDTO): Promise<Chapter> {
  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Chapter not found");
  }

  const targetSubjectId = payload.subjectId ?? existing.subjectId;
  const data: Prisma.ChapterUpdateInput = {};

  if (payload.subjectId && payload.subjectId !== existing.subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: payload.subjectId },
    });
    if (!subject) {
      throw new ApiError(404, "Target Subject not found");
    }
    data.subject = { connect: { id: payload.subjectId } };
  }

  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }

  if (payload.slug !== undefined || payload.name !== undefined) {
    const rawSlug = payload.slug ? payload.slug : payload.name ? payload.name : existing.name;
    const slug = slugify(rawSlug);
    if (slug !== existing.slug || targetSubjectId !== existing.subjectId) {
      const duplicateSlug = await prisma.chapter.findFirst({
        where: {
          subjectId: targetSubjectId,
          slug,
          id: { not: id },
        },
      });
      if (duplicateSlug) {
        throw new ApiError(400, `Chapter with slug '${slug}' already exists in this Subject`);
      }
      data.slug = slug;
    }
  }

  if (payload.chapterNumber !== undefined) data.chapterNumber = payload.chapterNumber;
  if (payload.description !== undefined) data.description = payload.description?.trim() ?? null;
  if (payload.totalEstimatedHours !== undefined)
    data.totalEstimatedHours = payload.totalEstimatedHours;
  if (payload.weightage !== undefined) data.weightage = payload.weightage;
  if (payload.orderIndex !== undefined) data.orderIndex = payload.orderIndex;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.isPublished !== undefined) data.isPublished = payload.isPublished;

  return prisma.chapter.update({
    where: { id },
    data,
  });
}

/**
 * Deletes a Chapter and cascades to child topics.
 *
 * @param id - Chapter UUID
 * @returns Deleted Chapter entity
 * @throws {ApiError} 404 If not found
 */
export async function deleteChapter(id: string): Promise<Chapter> {
  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Chapter not found");
  }

  return prisma.chapter.delete({ where: { id } });
}

/**
 * Toggles the active status of a Chapter.
 *
 * @param id - Chapter UUID
 * @returns Updated Chapter entity
 */
export async function toggleChapterStatus(id: string): Promise<Chapter> {
  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Chapter not found");
  }

  return prisma.chapter.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
}

/**
 * Batch updates orderIndex for Chapters.
 *
 * @param items - List of items with id and new orderIndex
 */
export async function reorderChapters(items: IReorderTaxonomyItemDTO[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.chapter.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      }),
    ),
  );
}

export const ChapterService = {
  createChapter,
  getAllChapters,
  getChapterById,
  updateChapter,
  deleteChapter,
  toggleChapterStatus,
  reorderChapters,
};
