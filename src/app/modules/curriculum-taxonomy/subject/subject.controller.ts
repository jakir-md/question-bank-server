/**
 * @file subject.controller.ts
 * @description Controller layer for Subject operations (MVC - Controller).
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Request, Response } from "express";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import { SubjectService } from "./subject.service";

/**
 * Controller to create a new Subject.
 */
export const createSubject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await SubjectService.createSubject(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Subject created successfully",
    data: result,
  });
});

/**
 * Controller to fetch all Subjects with filters & pagination.
 */
export const getAllSubjects = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const { educationLevelId, search, isActive, isPublished, page, limit, sortBy, sortOrder } =
    req.query;

  const filters = {
    educationLevelId: educationLevelId ? String(educationLevelId) : undefined,
    search: search ? String(search) : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? String(sortBy) : undefined,
    sortOrder: sortOrder === "desc" ? ("desc" as const) : ("asc" as const),
  };

  const { data, meta } = await SubjectService.getAllSubjects(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subjects fetched successfully",
    meta,
    data,
  });
});

/**
 * Controller to fetch a single Subject by ID.
 */
export const getSubjectById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await SubjectService.getSubjectById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subject fetched successfully",
    data: result,
  });
});

/**
 * Controller to update a Subject.
 */
export const updateSubject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await SubjectService.updateSubject(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subject updated successfully",
    data: result,
  });
});

/**
 * Controller to delete a Subject.
 */
export const deleteSubject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await SubjectService.deleteSubject(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subject deleted successfully",
    data: result,
  });
});

/**
 * Controller to toggle the active status of a Subject.
 */
export const toggleSubjectStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await SubjectService.toggleSubjectStatus(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Subject status changed to ${result.isActive ? "Active" : "Inactive"}`,
    data: result,
  });
});

/**
 * Controller to reorder Subjects.
 */
export const reorderSubjects = catchAsync(async (req: Request, res: Response): Promise<void> => {
  await SubjectService.reorderSubjects(req.body.items);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subjects reordered successfully",
    data: null,
  });
});

export const SubjectController = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  toggleSubjectStatus,
  reorderSubjects,
};
