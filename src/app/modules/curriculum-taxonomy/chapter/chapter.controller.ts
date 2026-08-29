/**
 * @file chapter.controller.ts
 * @description Controller layer for Chapter operations (MVC - Controller).
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Request, Response } from "express";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import { ChapterService } from "./chapter.service";

/**
 * Controller to create a new Chapter.
 */
export const createChapter = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await ChapterService.createChapter(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Chapter created successfully",
    data: result,
  });
});

/**
 * Controller to fetch all Chapters with filters & pagination.
 */
export const getAllChapters = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { subjectId, educationLevelId, search, isActive, isPublished, page, limit, sortBy, sortOrder } =
    req.query;

  const filters = {
    subjectId: subjectId ? String(subjectId) : undefined,
    educationLevelId: educationLevelId ? String(educationLevelId) : undefined,
    search: search ? String(search) : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? String(sortBy) : undefined,
    sortOrder: sortOrder === "desc" ? ("desc" as const) : ("asc" as const),
  };

  const { data, meta } = await ChapterService.getAllChapters(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chapters fetched successfully",
    meta,
    data,
  });
});

/**
 * Controller to fetch a single Chapter by ID.
 */
export const getChapterById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await ChapterService.getChapterById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chapter fetched successfully",
    data: result,
  });
});

/**
 * Controller to update a Chapter.
 */
export const updateChapter = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await ChapterService.updateChapter(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chapter updated successfully",
    data: result,
  });
});

/**
 * Controller to delete a Chapter.
 */
export const deleteChapter = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await ChapterService.deleteChapter(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chapter deleted successfully",
    data: result,
  });
});

/**
 * Controller to toggle the active status of a Chapter.
 */
export const toggleChapterStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await ChapterService.toggleChapterStatus(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Chapter status changed to ${result.isActive ? "Active" : "Inactive"}`,
    data: result,
  });
});

/**
 * Controller to reorder Chapters.
 */
export const reorderChapters = catchAsync(async (req: Request, res: Response): Promise<void> => {
  await ChapterService.reorderChapters(req.body.items);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chapters reordered successfully",
    data: null,
  });
});

export const ChapterController = {
  createChapter,
  getAllChapters,
  getChapterById,
  updateChapter,
  deleteChapter,
  toggleChapterStatus,
  reorderChapters,
};
