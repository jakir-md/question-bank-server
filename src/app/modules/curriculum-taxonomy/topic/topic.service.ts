/**
 * @file topic.service.ts
 * @description Business logic layer for Topic taxonomy tier (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { ImportanceLevel, DifficultyLevel, Prisma, Topic } from "@prisma/client";
import { prisma } from "../../../../shared/prisma";
import ApiError from "../../../error/ApiError";
import {
  ICreateTopicDTO,
  IReorderTaxonomyItemDTO,
  ITopicFilterOptions,
  IUpdateTopicDTO,
} from "../taxonomy.interface";
import { calculatePagination, slugify } from "../taxonomy.utils";

/**
 * Creates a new Topic under a Chapter (with optional parentTopicId for sub-topics).
 *
 * @param payload - Data transfer object containing Topic properties
 * @returns The created Topic entity
 * @throws {ApiError} 404 If parent Chapter or parent Topic not found, 400 If duplicate slug in chapter
 */
export async function createTopic(payload: ICreateTopicDTO): Promise<Topic> {
  const chapter = await prisma.chapter.findUnique({
    where: { id: payload.chapterId },
  });

  if (!chapter) {
    throw new ApiError(404, "Parent Chapter not found");
  }

  if (payload.parentTopicId) {
    const parentTopic = await prisma.topic.findUnique({
      where: { id: payload.parentTopicId },
    });
    if (!parentTopic) {
      throw new ApiError(404, "Parent Topic not found");
    }
  }

  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

  // Check unique slug in Chapter
  const existingSlug = await prisma.topic.findFirst({
    where: {
      chapterId: payload.chapterId,
      slug,
    },
  });

  if (existingSlug) {
    throw new ApiError(400, `Topic with slug '${slug}' already exists in this Chapter`);
  }

  // Calculate orderIndex if not specified
  let orderIndex = payload.orderIndex;
  if (orderIndex === undefined || orderIndex === null) {
    const highestOrder = await prisma.topic.aggregate({
      where: { chapterId: payload.chapterId },
      _max: { orderIndex: true },
    });
    orderIndex = (highestOrder._max.orderIndex ?? -1) + 1;
  }

  return prisma.topic.create({
    data: {
      chapterId: payload.chapterId,
      parentTopicId: payload.parentTopicId ?? null,
      topicNumber: payload.topicNumber?.trim() ?? null,
      name: payload.name.trim(),
      slug,
      description: payload.description?.trim() ?? null,
      learningObjectives: payload.learningObjectives ?? [],
      importanceLevel: payload.importanceLevel ?? ImportanceLevel.MEDIUM,
      difficultyLevel: payload.difficultyLevel ?? DifficultyLevel.MEDIUM,
      orderIndex,
      isActive: payload.isActive ?? true,
      isPublished: payload.isPublished ?? false,
    },
  });
}

/**
 * Retrieves paginated list of Topics with filters & search.
 *
 * @param filters - Query filters
 * @returns Paginated result list and metadata
 */
export async function getAllTopics(filters: ITopicFilterOptions): Promise<{
  data: (Topic & {
    chapter?: {
      id: string;
      name: string;
      subject: {
        id: string;
        name: string;
        educationLevel: { id: string; name: string };
      };
    };
    parentTopic?: { id: string; name: string } | null;
    _count?: { subTopics: number };
  })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.TopicWhereInput = {};

  if (filters.chapterId) {
    where.chapterId = filters.chapterId;
  }

  if (filters.subjectId) {
    where.chapter = { subjectId: filters.subjectId };
  }

  if (filters.educationLevelId) {
    where.chapter = { subject: { educationLevelId: filters.educationLevelId } };
  }

  if (filters.parentTopicId !== undefined) {
    where.parentTopicId = filters.parentTopicId;
  }

  if (filters.importanceLevel) {
    where.importanceLevel = filters.importanceLevel;
  }

  if (filters.difficultyLevel) {
    where.difficultyLevel = filters.difficultyLevel;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { topicNumber: { contains: filters.search, mode: "insensitive" } },
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
    prisma.topic.count({ where }),
    prisma.topic.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        chapter: {
          select: {
            id: true,
            name: true,
            subject: {
              select: {
                id: true,
                name: true,
                educationLevel: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
        parentTopic: {
          select: { id: true, name: true },
        },
        _count: {
          select: { subTopics: true },
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
 * Retrieves a single Topic by ID with relations.
 *
 * @param id - Topic UUID
 * @returns Topic entity with relations
 * @throws {ApiError} 404 If not found
 */
export async function getTopicById(id: string): Promise<
  Topic & {
    chapter: {
      id: string;
      name: string;
      subject: {
        id: string;
        name: string;
        educationLevel: { id: string; name: string };
      };
    };
    parentTopic: { id: string; name: string } | null;
    subTopics: { id: string; name: string; topicNumber: string | null }[];
  }
> {
  const topic = await prisma.topic.findUnique({
    where: { id },
    include: {
      chapter: {
        select: {
          id: true,
          name: true,
          subject: {
            select: {
              id: true,
              name: true,
              educationLevel: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      parentTopic: {
        select: { id: true, name: true },
      },
      subTopics: {
        orderBy: { orderIndex: "asc" },
        select: { id: true, name: true, topicNumber: true },
      },
    },
  });

  if (!topic) {
    throw new ApiError(404, "Topic not found");
  }

  return topic;
}

/**
 * Updates an existing Topic.
 *
 * @param id - Topic UUID
 * @param payload - Update DTO
 * @returns Updated Topic entity
 * @throws {ApiError} 404 If not found or 400 If duplicate slug in chapter
 */
export async function updateTopic(id: string, payload: IUpdateTopicDTO): Promise<Topic> {
  const existing = await prisma.topic.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Topic not found");
  }

  const targetChapterId = payload.chapterId ?? existing.chapterId;
  const data: Prisma.TopicUpdateInput = {};

  if (payload.chapterId && payload.chapterId !== existing.chapterId) {
    const chapter = await prisma.chapter.findUnique({
      where: { id: payload.chapterId },
    });
    if (!chapter) {
      throw new ApiError(404, "Target Chapter not found");
    }
    data.chapter = { connect: { id: payload.chapterId } };
  }

  if (payload.parentTopicId !== undefined) {
    if (payload.parentTopicId === id) {
      throw new ApiError(400, "Topic cannot be its own parent");
    }
    if (payload.parentTopicId === null) {
      data.parentTopic = { disconnect: true };
    } else {
      const parent = await prisma.topic.findUnique({
        where: { id: payload.parentTopicId },
      });
      if (!parent) {
        throw new ApiError(404, "Parent Topic not found");
      }
      data.parentTopic = { connect: { id: payload.parentTopicId } };
    }
  }

  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }

  if (payload.slug !== undefined || payload.name !== undefined) {
    const rawSlug = payload.slug ? payload.slug : payload.name ? payload.name : existing.name;
    const slug = slugify(rawSlug);
    if (slug !== existing.slug || targetChapterId !== existing.chapterId) {
      const duplicateSlug = await prisma.topic.findFirst({
        where: {
          chapterId: targetChapterId,
          slug,
          id: { not: id },
        },
      });
      if (duplicateSlug) {
        throw new ApiError(400, `Topic with slug '${slug}' already exists in this Chapter`);
      }
      data.slug = slug;
    }
  }

  if (payload.topicNumber !== undefined) data.topicNumber = payload.topicNumber?.trim() ?? null;
  if (payload.description !== undefined) data.description = payload.description?.trim() ?? null;
  if (payload.learningObjectives !== undefined)
    data.learningObjectives = payload.learningObjectives;
  if (payload.importanceLevel !== undefined) data.importanceLevel = payload.importanceLevel;
  if (payload.difficultyLevel !== undefined) data.difficultyLevel = payload.difficultyLevel;
  if (payload.orderIndex !== undefined) data.orderIndex = payload.orderIndex;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.isPublished !== undefined) data.isPublished = payload.isPublished;

  return prisma.topic.update({
    where: { id },
    data,
  });
}

/**
 * Deletes a Topic.
 *
 * @param id - Topic UUID
 * @returns Deleted Topic entity
 * @throws {ApiError} 404 If not found
 */
export async function deleteTopic(id: string): Promise<Topic> {
  const existing = await prisma.topic.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Topic not found");
  }

  return prisma.topic.delete({ where: { id } });
}

/**
 * Toggles the active status of a Topic.
 *
 * @param id - Topic UUID
 * @returns Updated Topic entity
 */
export async function toggleTopicStatus(id: string): Promise<Topic> {
  const existing = await prisma.topic.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Topic not found");
  }

  return prisma.topic.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
}

/**
 * Batch updates orderIndex for Topics.
 *
 * @param items - List of items with id and new orderIndex
 */
export async function reorderTopics(items: IReorderTaxonomyItemDTO[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.topic.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      }),
    ),
  );
}

export const TopicService = {
  createTopic,
  getAllTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
  toggleTopicStatus,
  reorderTopics,
};
