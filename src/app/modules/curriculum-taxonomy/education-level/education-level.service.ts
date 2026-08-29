/**
 * @file education-level.service.ts
 * @description Business logic layer for Education Level taxonomy tier (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { EducationLevel, Prisma } from "@prisma/client";
import { prisma } from "../../../../shared/prisma";
import ApiError from "../../../error/ApiError";
import {
  ICreateEducationLevelDTO,
  IEducationLevelFilterOptions,
  IReorderTaxonomyItemDTO,
  IUpdateEducationLevelDTO,
} from "../taxonomy.interface";
import { calculatePagination, slugify } from "../taxonomy.utils";

/**
 * Creates a new Education Level in the database.
 *
 * @param payload - Data transfer object containing Education Level properties
 * @returns The created EducationLevel entity
 * @throws {ApiError} 400 If code or slug already exists
 */
export async function createEducationLevel(
  payload: ICreateEducationLevelDTO,
): Promise<EducationLevel> {
  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

  // Check uniqueness of code and slug
  const existing = await prisma.educationLevel.findFirst({
    where: {
      OR: [{ code: payload.code.trim() }, { slug }],
    },
  });

  if (existing) {
    if (existing.code.toLowerCase() === payload.code.trim().toLowerCase()) {
      throw new ApiError(400, `Education Level with code '${payload.code}' already exists`);
    }
    throw new ApiError(400, `Education Level with slug '${slug}' already exists`);
  }

  // Determine order index if not provided
  let orderIndex = payload.orderIndex;
  if (orderIndex === undefined || orderIndex === null) {
    const highestOrder = await prisma.educationLevel.aggregate({
      _max: { orderIndex: true },
    });
    orderIndex = (highestOrder._max.orderIndex ?? -1) + 1;
  }

  return prisma.educationLevel.create({
    data: {
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      slug,
      description: payload.description?.trim() ?? null,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
      orderIndex,
      isActive: payload.isActive ?? true,
      isPublished: payload.isPublished ?? false,
    },
  });
}

/**
 * Retrieves paginated list of Education Levels with optional search and filters.
 *
 * @param filters - Query filter options
 * @returns Paginated result list and metadata
 */
export async function getAllEducationLevels(
  filters: IEducationLevelFilterOptions,
): Promise<{
  data: (EducationLevel & { _count?: { subjects: number } })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.EducationLevelWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
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
    prisma.educationLevel.count({ where }),
    prisma.educationLevel.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { subjects: true },
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
 * Retrieves a single Education Level by its unique identifier.
 *
 * @param id - Education Level UUID
 * @returns The EducationLevel entity with subject count
 * @throws {ApiError} 404 If not found
 */
export async function getEducationLevelById(id: string): Promise<
  EducationLevel & {
    subjects: {
      id: string;
      name: string;
      code: string;
      _count: { chapters: number };
    }[];
  }
> {
  const educationLevel = await prisma.educationLevel.findUnique({
    where: { id },
    include: {
      subjects: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { chapters: true } },
        },
      },
    },
  });

  if (!educationLevel) {
    throw new ApiError(404, "Education Level not found");
  }

  return educationLevel;
}

/**
 * Updates an existing Education Level.
 *
 * @param id - Education Level UUID
 * @param payload - Update DTO
 * @returns The updated EducationLevel entity
 * @throws {ApiError} 404 If not found or 400 If duplicate code/slug
 */
export async function updateEducationLevel(
  id: string,
  payload: IUpdateEducationLevelDTO,
): Promise<EducationLevel> {
  const existing = await prisma.educationLevel.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Education Level not found");
  }

  const data: Prisma.EducationLevelUpdateInput = {};

  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }

  if (payload.code !== undefined) {
    const code = payload.code.trim().toUpperCase();
    if (code !== existing.code) {
      const duplicateCode = await prisma.educationLevel.findUnique({ where: { code } });
      if (duplicateCode) {
        throw new ApiError(400, `Education Level with code '${code}' already exists`);
      }
      data.code = code;
    }
  }

  if (payload.slug !== undefined || payload.name !== undefined) {
    const rawSlug = payload.slug ? payload.slug : payload.name ? payload.name : existing.name;
    const slug = slugify(rawSlug);
    if (slug !== existing.slug) {
      const duplicateSlug = await prisma.educationLevel.findUnique({ where: { slug } });
      if (duplicateSlug) {
        throw new ApiError(400, `Education Level with slug '${slug}' already exists`);
      }
      data.slug = slug;
    }
  }

  if (payload.description !== undefined) data.description = payload.description?.trim() ?? null;
  if (payload.icon !== undefined) data.icon = payload.icon ?? null;
  if (payload.color !== undefined) data.color = payload.color ?? null;
  if (payload.orderIndex !== undefined) data.orderIndex = payload.orderIndex;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.isPublished !== undefined) data.isPublished = payload.isPublished;

  return prisma.educationLevel.update({
    where: { id },
    data,
  });
}

/**
 * Deletes an Education Level and cascades to children.
 *
 * @param id - Education Level UUID
 * @returns The deleted EducationLevel entity
 * @throws {ApiError} 404 If not found
 */
export async function deleteEducationLevel(id: string): Promise<EducationLevel> {
  const existing = await prisma.educationLevel.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Education Level not found");
  }

  return prisma.educationLevel.delete({ where: { id } });
}

/**
 * Toggles active status of an Education Level.
 *
 * @param id - Education Level UUID
 * @returns The updated EducationLevel entity
 */
export async function toggleEducationLevelStatus(id: string): Promise<EducationLevel> {
  const existing = await prisma.educationLevel.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Education Level not found");
  }

  return prisma.educationLevel.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
}

/**
 * Batch updates orderIndex for Education Levels.
 *
 * @param items - List of items with id and new orderIndex
 */
export async function reorderEducationLevels(items: IReorderTaxonomyItemDTO[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.educationLevel.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      }),
    ),
  );
}

export const EducationLevelService = {
  createEducationLevel,
  getAllEducationLevels,
  getEducationLevelById,
  updateEducationLevel,
  deleteEducationLevel,
  toggleEducationLevelStatus,
  reorderEducationLevels,
};
