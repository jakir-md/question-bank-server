/**
 * @file subject.service.ts
 * @description Business logic layer for Subject taxonomy tier (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { Prisma, Subject } from "@prisma/client";
import { prisma } from "../../../../shared/prisma";
import ApiError from "../../../error/ApiError";
import {
  ICreateSubjectDTO,
  IReorderTaxonomyItemDTO,
  ISubjectFilterOptions,
  IUpdateSubjectDTO,
} from "../taxonomy.interface";
import { calculatePagination, slugify } from "../taxonomy.utils";

/**
 * Creates a new Subject under an Education Level.
 *
 * @param payload - Data transfer object containing Subject properties
 * @returns The created Subject entity
 * @throws {ApiError} 400 If duplicate code/slug within the education level or if level does not exist
 */
export async function createSubject(payload: ICreateSubjectDTO): Promise<Subject> {
  // Validate parent Education Level
  const level = await prisma.educationLevel.findUnique({
    where: { id: payload.educationLevelId },
  });

  if (!level) {
    throw new ApiError(404, "Parent Education Level not found");
  }

  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);
  const code = payload.code.trim().toUpperCase();

  // Check unique constraints within level
  const existing = await prisma.subject.findFirst({
    where: {
      educationLevelId: payload.educationLevelId,
      OR: [{ code }, { slug }],
    },
  });

  if (existing) {
    if (existing.code === code) {
      throw new ApiError(
        400,
        `Subject with code '${code}' already exists in this Education Level`,
      );
    }
    throw new ApiError(
      400,
      `Subject with slug '${slug}' already exists in this Education Level`,
    );
  }

  // Calculate orderIndex if not specified
  let orderIndex = payload.orderIndex;
  if (orderIndex === undefined || orderIndex === null) {
    const highestOrder = await prisma.subject.aggregate({
      where: { educationLevelId: payload.educationLevelId },
      _max: { orderIndex: true },
    });
    orderIndex = (highestOrder._max.orderIndex ?? -1) + 1;
  }

  return prisma.subject.create({
    data: {
      educationLevelId: payload.educationLevelId,
      name: payload.name.trim(),
      code,
      slug,
      description: payload.description?.trim() ?? null,
      icon: payload.icon ?? null,
      color: payload.color ?? null,
      paper: payload.paper?.trim() ?? null,
      subjectCode: payload.subjectCode?.trim() ?? null,
      orderIndex,
      isActive: payload.isActive ?? true,
      isPublished: payload.isPublished ?? false,
    },
  });
}

/**
 * Retrieves paginated list of Subjects with filters & search.
 *
 * @param filters - Query filters
 * @returns Paginated result list and metadata
 */
export async function getAllSubjects(filters: ISubjectFilterOptions): Promise<{
  data: (Subject & {
    educationLevel?: { id: string; name: string; code: string };
    _count?: { chapters: number };
  })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.SubjectWhereInput = {};

  if (filters.educationLevelId) {
    where.educationLevelId = filters.educationLevelId;
  }

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { paper: { contains: filters.search, mode: "insensitive" } },
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
    prisma.subject.count({ where }),
    prisma.subject.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        educationLevel: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { chapters: true },
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
 * Retrieves a single Subject by ID with relations.
 *
 * @param id - Subject UUID
 * @returns Subject entity with parent level and chapters
 * @throws {ApiError} 404 If not found
 */
export async function getSubjectById(id: string): Promise<
  Subject & {
    educationLevel: { id: string; name: string; code: string };
    chapters: {
      id: string;
      name: string;
      chapterNumber: number | null;
      _count: { topics: number };
    }[];
  }
> {
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      educationLevel: {
        select: { id: true, name: true, code: true },
      },
      chapters: {
        orderBy: { orderIndex: "asc" },
        select: {
          id: true,
          name: true,
          chapterNumber: true,
          _count: { select: { topics: true } },
        },
      },
    },
  });

  if (!subject) {
    throw new ApiError(404, "Subject not found");
  }

  return subject;
}

/**
 * Updates an existing Subject.
 *
 * @param id - Subject UUID
 * @param payload - Update DTO
 * @returns Updated Subject entity
 * @throws {ApiError} 404 If not found or 400 If duplicate code/slug within level
 */
export async function updateSubject(id: string, payload: IUpdateSubjectDTO): Promise<Subject> {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Subject not found");
  }

  const targetLevelId = payload.educationLevelId ?? existing.educationLevelId;
  const data: Prisma.SubjectUpdateInput = {};

  if (payload.educationLevelId && payload.educationLevelId !== existing.educationLevelId) {
    const level = await prisma.educationLevel.findUnique({
      where: { id: payload.educationLevelId },
    });
    if (!level) {
      throw new ApiError(404, "Target Education Level not found");
    }
    data.educationLevel = { connect: { id: payload.educationLevelId } };
  }

  if (payload.name !== undefined) {
    data.name = payload.name.trim();
  }

  if (payload.code !== undefined) {
    const code = payload.code.trim().toUpperCase();
    if (code !== existing.code || targetLevelId !== existing.educationLevelId) {
      const duplicateCode = await prisma.subject.findFirst({
        where: {
          educationLevelId: targetLevelId,
          code,
          id: { not: id },
        },
      });
      if (duplicateCode) {
        throw new ApiError(
          400,
          `Subject with code '${code}' already exists in this Education Level`,
        );
      }
      data.code = code;
    }
  }

  if (payload.slug !== undefined || payload.name !== undefined) {
    const rawSlug = payload.slug ? payload.slug : payload.name ? payload.name : existing.name;
    const slug = slugify(rawSlug);
    if (slug !== existing.slug || targetLevelId !== existing.educationLevelId) {
      const duplicateSlug = await prisma.subject.findFirst({
        where: {
          educationLevelId: targetLevelId,
          slug,
          id: { not: id },
        },
      });
      if (duplicateSlug) {
        throw new ApiError(
          400,
          `Subject with slug '${slug}' already exists in this Education Level`,
        );
      }
      data.slug = slug;
    }
  }

  if (payload.description !== undefined) data.description = payload.description?.trim() ?? null;
  if (payload.icon !== undefined) data.icon = payload.icon ?? null;
  if (payload.color !== undefined) data.color = payload.color ?? null;
  if (payload.paper !== undefined) data.paper = payload.paper?.trim() ?? null;
  if (payload.subjectCode !== undefined) data.subjectCode = payload.subjectCode?.trim() ?? null;
  if (payload.orderIndex !== undefined) data.orderIndex = payload.orderIndex;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;
  if (payload.isPublished !== undefined) data.isPublished = payload.isPublished;

  return prisma.subject.update({
    where: { id },
    data,
  });
}

/**
 * Deletes a Subject and cascades to child chapters.
 *
 * @param id - Subject UUID
 * @returns Deleted Subject entity
 * @throws {ApiError} 404 If not found
 */
export async function deleteSubject(id: string): Promise<Subject> {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Subject not found");
  }

  return prisma.subject.delete({ where: { id } });
}

/**
 * Toggles the active status of a Subject.
 *
 * @param id - Subject UUID
 * @returns Updated Subject entity
 */
export async function toggleSubjectStatus(id: string): Promise<Subject> {
  const existing = await prisma.subject.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Subject not found");
  }

  return prisma.subject.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
}

/**
 * Batch updates orderIndex for Subjects.
 *
 * @param items - List of items with id and new orderIndex
 */
export async function reorderSubjects(items: IReorderTaxonomyItemDTO[]): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.subject.update({
        where: { id: item.id },
        data: { orderIndex: item.orderIndex },
      }),
    ),
  );
}

export const SubjectService = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  toggleSubjectStatus,
  reorderSubjects,
};
