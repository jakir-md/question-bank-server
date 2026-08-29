/**
 * @file tag.controller.ts
 * @description Express Controller layer for Tag endpoints (MVC - Controller).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { TagCategory } from "@prisma/client";
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TagService } from "./tag.service";

/**
 * Controller to create a new Tag.
 */
export const createTag = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await TagService.createTag(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Tag created successfully",
    data: result,
  });
});

/**
 * Controller to fetch all Tags with filtering, pagination, and sorting.
 */
export const getAllTags = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { search, category, isActive, page, limit, sortBy, sortOrder } = req.query;

  const filters = {
    search: search ? String(search) : undefined,
    category: category ? (category as TagCategory) : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? (String(sortBy) as any) : undefined,
    sortOrder: sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
  };

  const { data, meta } = await TagService.getAllTags(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tags fetched successfully",
    meta,
    data,
  });
});

/**
 * Controller for fast Tag autocomplete search suggestions.
 */
export const autocompleteTags = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { query, category, limit, onlyActive } = req.query;

  const result = await TagService.autocompleteTags({
    query: String(query || ""),
    category: category ? (category as TagCategory) : undefined,
    limit: limit ? Number(limit) : 10,
    onlyActive: onlyActive !== undefined ? onlyActive === "true" : true,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tag suggestions retrieved successfully",
    data: result,
  });
});

/**
 * Controller to fetch a single Tag by ID.
 */
export const getTagById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TagService.getTagById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tag fetched successfully",
    data: result,
  });
});

/**
 * Controller to update an existing Tag.
 */
export const updateTag = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TagService.updateTag(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tag updated successfully",
    data: result,
  });
});

/**
 * Controller to delete a Tag.
 */
export const deleteTag = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TagService.deleteTag(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tag deleted successfully",
    data: result,
  });
});

/**
 * Controller to toggle the active status of a Tag.
 */
export const toggleTagStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TagService.toggleTagStatus(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Tag status changed to ${result.isActive ? "Active" : "Inactive"}`,
    data: result,
  });
});

/**
 * Controller to bulk create or find tags.
 */
export const bulkCreateTags = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await TagService.bulkCreateOrFindTags(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Tags processed successfully",
    data: result,
  });
});

/**
 * Controller to fetch all Tag categories with metadata and counts.
 */
export const getTagCategories = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await TagService.getTagCategories();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tag categories fetched successfully",
    data: result,
  });
});

/**
 * Controller to fetch Tag system summary metrics & stats.
 */
export const getTagStats = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await TagService.getTagStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Tag statistics fetched successfully",
    data: result,
  });
});

/**
 * Controller to fetch the most popular / highest used tags.
 */
export const getPopularTags = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const result = await TagService.getPopularTags(limit);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Popular tags fetched successfully",
    data: result,
  });
});

export const TagController = {
  createTag,
  getAllTags,
  autocompleteTags,
  getTagById,
  updateTag,
  deleteTag,
  toggleTagStatus,
  bulkCreateTags,
  getTagCategories,
  getTagStats,
  getPopularTags,
};
