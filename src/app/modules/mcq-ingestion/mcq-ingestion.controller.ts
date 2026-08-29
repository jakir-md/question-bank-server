/**
 * @file mcq-ingestion.controller.ts
 * @description Express Controller layer for MCQ Ingestion (Single & Multi-Context) (MVC - Controller).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { ContextType, DifficultyLevel, QuestionType } from "@prisma/client";
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MCQIngestionService } from "./mcq-ingestion.service";

/**
 * Ingest a Single Standalone MCQ Item.
 */
export const ingestSingleMCQ = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await MCQIngestionService.ingestSingleMCQ(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Single MCQ ingested successfully",
    data: result,
  });
});

/**
 * Ingest a Multi-Context Question Package (Passage/Stem + Sub-Questions).
 */
export const ingestMultiContextMCQ = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const result = await MCQIngestionService.ingestMultiContextMCQ(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Multi-Context MCQ package ingested successfully",
    data: result,
  });
});

/**
 * Query/Filter paginated MCQs.
 */
export const getMCQs = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const {
    search,
    educationLevelId,
    subjectId,
    chapterId,
    topicId,
    contextId,
    isMultiContext,
    difficulty,
    questionType,
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
    contextId: contextId ? String(contextId) : undefined,
    isMultiContext:
      isMultiContext !== undefined
        ? isMultiContext === "true" || isMultiContext === "1"
        : undefined,
    difficulty: difficulty ? (difficulty as DifficultyLevel) : undefined,
    questionType: questionType ? (questionType as QuestionType) : undefined,
    tags: tagList,
    operator: operator === "OR" ? ("OR" as const) : ("AND" as const),
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? (String(sortBy) as any) : undefined,
    sortOrder: sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
  };

  const { data, meta } = await MCQIngestionService.getMCQs(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "MCQs retrieved successfully",
    meta,
    data,
  });
});

/**
 * Get Single MCQ by ID.
 */
export const getMCQById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await MCQIngestionService.getMCQById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "MCQ retrieved successfully",
    data: result,
  });
});

/**
 * Update an existing MCQ.
 */
export const updateMCQ = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await MCQIngestionService.updateMCQ(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "MCQ updated successfully",
    data: result,
  });
});

/**
 * Delete an MCQ.
 */
export const deleteMCQ = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await MCQIngestionService.deleteMCQ(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "MCQ deleted successfully",
    data: result,
  });
});

/**
 * Get Question Contexts (Passages/Stems).
 */
export const getQuestionContexts = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const {
    search,
    educationLevelId,
    subjectId,
    chapterId,
    topicId,
    contextType,
    isActive,
    isPublished,
    page,
    limit,
    sortBy,
    sortOrder,
  } = req.query;

  const filters = {
    search: search ? String(search) : undefined,
    educationLevelId: educationLevelId ? String(educationLevelId) : undefined,
    subjectId: subjectId ? String(subjectId) : undefined,
    chapterId: chapterId ? String(chapterId) : undefined,
    topicId: topicId ? String(topicId) : undefined,
    contextType: contextType ? (contextType as ContextType) : undefined,
    isActive: isActive !== undefined ? isActive === "true" : undefined,
    isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy: sortBy ? (String(sortBy) as any) : undefined,
    sortOrder: sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
  };

  const { data, meta } = await MCQIngestionService.getQuestionContexts(filters);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Question contexts retrieved successfully",
    meta,
    data,
  });
});

/**
 * Get Question Context by ID with sub-questions.
 */
export const getQuestionContextById = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await MCQIngestionService.getQuestionContextById(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Question context retrieved successfully",
    data: result,
  });
});

/**
 * Update Question Context.
 */
export const updateQuestionContext = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await MCQIngestionService.updateQuestionContext(id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Question context updated successfully",
    data: result,
  });
});

/**
 * Delete Question Context.
 */
export const deleteQuestionContext = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const result = await MCQIngestionService.deleteQuestionContext(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Question context deleted successfully",
    data: result,
  });
});

/**
 * Get MCQ Ingestion summary statistics.
 */
export const getMCQStats = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await MCQIngestionService.getMCQStats();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "MCQ statistics fetched successfully",
    data: result,
  });
});

export const MCQIngestionController = {
  ingestSingleMCQ,
  ingestMultiContextMCQ,
  getMCQs,
  getMCQById,
  updateMCQ,
  deleteMCQ,
  getQuestionContexts,
  getQuestionContextById,
  updateQuestionContext,
  deleteQuestionContext,
  getMCQStats,
};
