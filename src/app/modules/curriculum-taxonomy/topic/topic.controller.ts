/**
 * @file topic.controller.ts
 * @description Controller layer for Topic operations (MVC - Controller).
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Request, Response } from "express";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import { TopicService } from "./topic.service";
import { ImportanceLevel, DifficultyLevel } from "@prisma/client";

/**
 * Controller to create a new Topic.
 */
export const createTopic = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await TopicService.createTopic(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Topic created successfully",
    data: result,
  });
});

/**
 * Controller to fetch all Topics with filters & pagination.
 */
export const getAllTopics = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const {
    chapterId,
    subjectId,
    educationLevelId,
    parentTopicId,
    importanceLevel,
    difficultyLevel,
    search,
    isActive,
    isPublished,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const filters = {
    chapterId: chapterId ? String(chapterId) : undefined,
    subjectId: subjectId ? String(subjectId) : undefined,
    educationLevelId: educationLevelId ? String(educationLevelId) : undefined,
    parentTopicId:
      parentTopicId === "null"
        ? null
        : parentTopicId
          ? String(parentTopicId)
          : undefined,
    importanceLevel: importanceLevel ? (importanceLevel as ImportanceLevel) : undefined,
    difficultyLevel: difficultyLevel ? (difficultyLevel as DifficultyLevel) : undefined,
    search: search ? String(search) : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? String(sortBy) : undefined,
    sortOrder: sortOrder === "desc" ? ("desc" as const) : ("asc" as const),
  };

  const { data, meta } = await TopicService.getAllTopics(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Topics fetched successfully",
    meta,
    data,
  });
});

/**
 * Controller to fetch a single Topic by ID.
 */
export const getTopicById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TopicService.getTopicById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Topic fetched successfully",
    data: result,
  });
});

/**
 * Controller to update a Topic.
 */
export const updateTopic = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TopicService.updateTopic(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Topic updated successfully",
    data: result,
  });
});

/**
 * Controller to delete a Topic.
 */
export const deleteTopic = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TopicService.deleteTopic(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Topic deleted successfully",
    data: result,
  });
});

/**
 * Controller to toggle the active status of a Topic.
 */
export const toggleTopicStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await TopicService.toggleTopicStatus(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: `Topic status changed to ${result.isActive ? "Active" : "Inactive"}`,
    data: result,
  });
});

/**
 * Controller to reorder Topics.
 */
export const reorderTopics = catchAsync(async (req: Request, res: Response): Promise<void> => {
  await TopicService.reorderTopics(req.body.items);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Topics reordered successfully",
    data: null,
  });
});

export const TopicController = {
  createTopic,
  getAllTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
  toggleTopicStatus,
  reorderTopics,
};
