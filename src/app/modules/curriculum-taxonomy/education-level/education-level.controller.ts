/**
 * @file education-level.controller.ts
 * @description Controller layer for Education Level operations (MVC - Controller).
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Request, Response } from "express";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import { EducationLevelService } from "./education-level.service";

/**
 * Controller to handle Education Level creation.
 */
export const createEducationLevel = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await EducationLevelService.createEducationLevel(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Education Level created successfully",
    data: result,
  });
});

/**
 * Controller to fetch all Education Levels with filters & pagination.
 */
export const getAllEducationLevels = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { search, isActive, isPublished, page, limit, sortBy, sortOrder } = req.query;

  const filters = {
    search: search ? String(search) : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? String(sortBy) : undefined,
    sortOrder: sortOrder === "desc" ? ("desc" as const) : ("asc" as const),
  };

  const { data, meta } = await EducationLevelService.getAllEducationLevels(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Education Levels fetched successfully",
    meta,
    data,
  });
});

/**
 * Controller to fetch a single Education Level by ID.
 */
export const getEducationLevelById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await EducationLevelService.getEducationLevelById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Education Level fetched successfully",
    data: result,
  });
});

/**
 * Controller to update an Education Level.
 */
export const updateEducationLevel = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await EducationLevelService.updateEducationLevel(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Education Level updated successfully",
    data: result,
  });
});

/**
 * Controller to delete an Education Level.
 */
export const deleteEducationLevel = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await EducationLevelService.deleteEducationLevel(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Education Level deleted successfully",
    data: result,
  });
});

/**
 * Controller to toggle the active status of an Education Level.
 */
export const toggleEducationLevelStatus = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await EducationLevelService.toggleEducationLevelStatus(id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: `Education Level status changed to ${result.isActive ? "Active" : "Inactive"}`,
      data: result,
    });
  },
);

/**
 * Controller to reorder Education Levels.
 */
export const reorderEducationLevels = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    await EducationLevelService.reorderEducationLevels(req.body.items);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Education Levels reordered successfully",
      data: null,
    });
  },
);

export const EducationLevelController = {
  createEducationLevel,
  getAllEducationLevels,
  getEducationLevelById,
  updateEducationLevel,
  deleteEducationLevel,
  toggleEducationLevelStatus,
  reorderEducationLevels,
};
