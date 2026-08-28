/**
 * @file tag.service.ts
 * @description Core business logic and database queries for Tag Management & Autocomplete (MVC - Model/Service).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { Prisma, Tag, TagCategory } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";
import {
  IAutocompleteTagOptions,
  IBulkCreateTagsDTO,
  ICreateTagDTO,
  ITagCategorySummary,
  ITagFilterOptions,
  ITagStatsResponse,
  IUpdateTagDTO,
} from "./tag.interface";
import {
  calculatePagination,
  getDefaultCategoryColor,
  getDefaultCategoryIcon,
  slugify,
  TAG_CATEGORY_METADATA,
} from "./tag.utils";

/**
 * Creates a new Tag with unique name and slug.
 *
 * @param payload - Tag creation payload
 * @returns The created Tag entity
 * @throws {ApiError} 400 If tag name or slug already exists
 */
export async function createTag(payload: ICreateTagDTO): Promise<Tag> {
  const name = payload.name.trim();
  const slug = payload.slug ? slugify(payload.slug) : slugify(name);
  const category = payload.category ?? TagCategory.CUSTOM;
  const color = payload.color ?? getDefaultCategoryColor(category);
  const icon = payload.icon ?? getDefaultCategoryIcon(category);

  // Check uniqueness of slug or case-insensitive name
  const existing = await prisma.tag.findFirst({
    where: {
      OR: [
        { slug },
        { name: { equals: name, mode: "insensitive" } },
      ],
    },
  });

  if (existing) {
    if (existing.slug === slug) {
      throw new ApiError(400, `Tag with slug '${slug}' already exists`);
    }
    throw new ApiError(400, `Tag with name '${name}' already exists`);
  }

  return prisma.tag.create({
    data: {
      name,
      slug,
      category,
      description: payload.description?.trim() ?? null,
      color,
      icon,
      isActive: payload.isActive ?? true,
    },
  });
}

/**
 * Retrieves paginated list of Tags with optional category, search, and status filters.
 *
 * @param filters - Query filter parameters
 * @returns Paginated tags and metadata
 */
export async function getAllTags(filters: ITagFilterOptions): Promise<{
  data: (Tag & { _count: { questions: number } })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const { page, limit, skip, take } = calculatePagination(filters.page, filters.limit);
  const where: Prisma.TagWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (typeof filters.isActive === "boolean") {
    where.isActive = filters.isActive;
  }

  const sortBy = filters.sortBy || "createdAt";
  const sortOrder = filters.sortOrder || "desc";

  const [total, data] = await Promise.all([
    prisma.tag.count({ where }),
    prisma.tag.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        _count: {
          select: { questions: true },
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
 * High-speed autocomplete query for finding tags by prefix or keyword.
 * Prioritizes active tags and ranks by `usageCount` DESC (most popular tags first).
 *
 * @param options - Autocomplete query options
 * @returns List of matching tags optimized for dropdown suggestion
 */
export async function autocompleteTags(options: IAutocompleteTagOptions): Promise<Tag[]> {
  const query = options.query.trim();
  if (!query) {
    return [];
  }

  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const where: Prisma.TagWhereInput = {
    AND: [
      options.onlyActive !== false ? { isActive: true } : {},
      options.category ? { category: options.category } : {},
      {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { slug: { contains: query, mode: "insensitive" } },
        ],
      },
    ],
  };

  return prisma.tag.findMany({
    where,
    take: limit,
    orderBy: [
      { usageCount: "desc" },
      { name: "asc" },
    ],
  });
}

/**
 * Retrieves a single Tag by ID with associated question counts.
 *
 * @param id - Tag UUID
 * @returns Tag with question statistics
 * @throws {ApiError} 404 If tag is not found
 */
export async function getTagById(id: string): Promise<
  Tag & {
    _count: { questions: number };
    questions: {
      question: {
        id: string;
        questionText: string;
        questionType: string;
        difficulty: string;
      };
    }[];
  }
> {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: { questions: true },
      },
      questions: {
        take: 10,
        include: {
          question: {
            select: {
              id: true,
              questionText: true,
              questionType: true,
              difficulty: true,
            },
          },
        },
      },
    },
  });

  if (!tag) {
    throw new ApiError(404, "Tag not found");
  }

  return tag;
}

/**
 * Updates an existing Tag.
 *
 * @param id - Tag UUID
 * @param payload - Update fields
 * @returns The updated Tag entity
 * @throws {ApiError} 404 If not found or 400 If duplicate name/slug
 */
export async function updateTag(id: string, payload: IUpdateTagDTO): Promise<Tag> {
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Tag not found");
  }

  const data: Prisma.TagUpdateInput = {};

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (name !== existing.name) {
      const duplicateName = await prisma.tag.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      });
      if (duplicateName) {
        throw new ApiError(400, `Tag with name '${name}' already exists`);
      }
      data.name = name;
    }
  }

  if (payload.slug !== undefined) {
    const slug = slugify(payload.slug);
    if (slug !== existing.slug) {
      const duplicateSlug = await prisma.tag.findUnique({ where: { slug } });
      if (duplicateSlug && duplicateSlug.id !== id) {
        throw new ApiError(400, `Tag with slug '${slug}' already exists`);
      }
      data.slug = slug;
    }
  }

  if (payload.category !== undefined) data.category = payload.category;
  if (payload.description !== undefined) data.description = payload.description?.trim() ?? null;
  if (payload.color !== undefined) data.color = payload.color ?? null;
  if (payload.icon !== undefined) data.icon = payload.icon ?? null;
  if (payload.isActive !== undefined) data.isActive = payload.isActive;

  return prisma.tag.update({
    where: { id },
    data,
  });
}

/**
 * Deletes a Tag by ID.
 *
 * @param id - Tag UUID
 * @returns The deleted Tag entity
 * @throws {ApiError} 404 If not found
 */
export async function deleteTag(id: string): Promise<Tag> {
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Tag not found");
  }

  return prisma.tag.delete({ where: { id } });
}

/**
 * Toggles the active status of a Tag.
 *
 * @param id - Tag UUID
 * @returns The updated Tag entity
 */
export async function toggleTagStatus(id: string): Promise<Tag> {
  const existing = await prisma.tag.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Tag not found");
  }

  return prisma.tag.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });
}

/**
 * Bulk creates or resolves existing tags by list of names/categories.
 * Useful for fast multi-tag input when user enters new or existing tags.
 *
 * @param payload - Bulk tag items
 * @returns All resolved Tag entities (both existing and newly created)
 */
export async function bulkCreateOrFindTags(payload: IBulkCreateTagsDTO): Promise<Tag[]> {
  const results: Tag[] = [];

  for (const item of payload.tags) {
    const name = item.name.trim();
    if (!name) continue;

    const slug = slugify(name);
    let tag = await prisma.tag.findFirst({
      where: {
        OR: [
          { slug },
          { name: { equals: name, mode: "insensitive" } },
        ],
      },
    });

    if (!tag) {
      const category = item.category ?? TagCategory.CUSTOM;
      tag = await prisma.tag.create({
        data: {
          name,
          slug,
          category,
          color: item.color ?? getDefaultCategoryColor(category),
          description: item.description?.trim() ?? null,
          icon: getDefaultCategoryIcon(category),
          isActive: true,
        },
      });
    }

    results.push(tag);
  }

  return results;
}

/**
 * Retrieves category breakdown with metadata, counts, and descriptions.
 *
 * @returns List of category summaries
 */
export async function getTagCategories(): Promise<ITagCategorySummary[]> {
  const categoryCounts = await prisma.tag.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  const countMap = new Map<TagCategory, number>();
  categoryCounts.forEach((c) => countMap.set(c.category, c._count.id));

  return Object.values(TagCategory).map((cat) => {
    const meta = TAG_CATEGORY_METADATA[cat];
    return {
      category: cat,
      label: meta.label,
      count: countMap.get(cat) ?? 0,
      color: meta.color,
      icon: meta.icon,
      description: meta.description,
    };
  });
}

/**
 * Retrieves aggregate metrics & analytics for the Tagging system.
 *
 * @returns Comprehensive tagging stats
 */
export async function getTagStats(): Promise<ITagStatsResponse> {
  const [totalTags, activeTags, totalQuestionAttachments, categories, topTags] = await Promise.all([
    prisma.tag.count(),
    prisma.tag.count({ where: { isActive: true } }),
    prisma.questionTag.count(),
    getTagCategories(),
    prisma.tag.findMany({
      take: 8,
      orderBy: { usageCount: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        color: true,
        usageCount: true,
      },
    }),
  ]);

  return {
    totalTags,
    activeTags,
    inactiveTags: totalTags - activeTags,
    totalQuestionAttachments,
    categories,
    topTags,
  };
}

/**
 * Retrieves the most popular / frequently attached tags.
 *
 * @param limit - Max count
 * @returns Top tags list
 */
export async function getPopularTags(limit: number = 10): Promise<Tag[]> {
  return prisma.tag.findMany({
    where: { isActive: true },
    take: limit,
    orderBy: { usageCount: "desc" },
  });
}

export const TagService = {
  createTag,
  getAllTags,
  autocompleteTags,
  getTagById,
  updateTag,
  deleteTag,
  toggleTagStatus,
  bulkCreateOrFindTags,
  getTagCategories,
  getTagStats,
  getPopularTags,
};
