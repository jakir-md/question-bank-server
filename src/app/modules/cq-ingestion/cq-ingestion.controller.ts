/**
 * @file cq-ingestion.controller.ts
 * @description Express Controller layer for Creative Question (CQ) Ingestion (MVC - Controller).
 * Handles HTTP requests, parameter parsing, service delegation, and JSON response formatting.
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { DifficultyLevel } from "@prisma/client";
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { CQIngestionService } from "./cq-ingestion.service";

/**
 * Ingest a complete Creative Question (CQ) package (Uddipok Stimulus + 4 Sub-Questions ক, খ, গ, ঘ).
 */
export const ingestCQ = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await CQIngestionService.ingestCQ(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Creative Question (CQ) ingested successfully",
    data: result,
  });
});

/**
 * Query/Filter paginated Creative Questions.
 */
export const getCQs = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const {
    search,
    educationLevelId,
    subjectId,
    chapterId,
    topicId,
    difficulty,
    tags,
    operator,
    isActive,
    isPublished,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const tagList = tags ? String(tags).split(",").map((t) => t.trim()).filter(Boolean) : undefined;

  const filters = {
    search: search ? String(search) : undefined,
    educationLevelId: educationLevelId ? String(educationLevelId) : undefined,
    subjectId: subjectId ? String(subjectId) : undefined,
    chapterId: chapterId ? String(chapterId) : undefined,
    topicId: topicId ? String(topicId) : undefined,
    difficulty: difficulty ? (difficulty as DifficultyLevel) : undefined,
    tags: tagList,
    operator: operator === "OR" ? ("OR" as const) : ("AND" as const),
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? (String(sortBy) as any) : undefined,
    sortOrder: sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
  };

  const { data, meta } = await CQIngestionService.getCQs(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Creative Questions retrieved successfully",
    meta,
    data,
  });
});

/**
 * Get Single Creative Question (CQ) by ID with full stimulus and 4 sub-questions.
 */
export const getCQById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await CQIngestionService.getCQById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Creative Question retrieved successfully",
    data: result,
  });
});

/**
 * Update an existing Creative Question (CQ).
 */
export const updateCQ = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await CQIngestionService.updateCQ(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Creative Question updated successfully",
    data: result,
  });
});

/**
 * Delete a Creative Question (CQ) package.
 */
export const deleteCQ = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await CQIngestionService.deleteCQ(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Creative Question deleted successfully",
    data: result,
  });
});

/**
 * Get CQ summary statistics and cognitive breakdown.
 */
export const getCQStats = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await CQIngestionService.getCQStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Creative Question statistics fetched successfully",
    data: result,
  });
});

export const CQIngestionController = {
  ingestCQ,
  getCQs,
  getCQById,
  updateCQ,
  deleteCQ,
  getCQStats,
};
