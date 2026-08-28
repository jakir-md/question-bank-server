/**
 * @file question-tag.controller.ts
 * @description Express Controller layer for Question Tagging & Filter Endpoints (MVC - Controller).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { DifficultyLevel, QuestionType } from "@prisma/client";
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { QuestionTagService } from "./question-tag.service";

/**
 * Controller to attach or sync tags to a question.
 */
export const attachTagsToQuestion = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const questionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await QuestionTagService.attachTagsToQuestion(questionId, req.body);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Question tags synchronized successfully",
      data: result,
    });
  },
);

/**
 * Controller to create a Question with custom tags in one operation.
 */
export const createQuestionWithTags = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const result = await QuestionTagService.createQuestionWithTags(req.body);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Question created and tagged successfully",
      data: result,
    });
  },
);

/**
 * Controller to get all tags attached to a specific question.
 */
export const getQuestionTags = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const questionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await QuestionTagService.getQuestionTags(questionId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Question tags fetched successfully",
      data: result,
    });
  },
);

/**
 * Controller to filter questions by multiple custom tags and curriculum hierarchy.
 */
export const filterQuestionsByTags = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const {
      tags,
      operator,
      educationLevelId,
      subjectId,
      chapterId,
      topicId,
      difficulty,
      questionType,
      search,
      isActive,
      isPublished,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const tagList = tags ? String(tags).split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    const filters = {
      tags: tagList,
      operator: operator === "OR" ? ("OR" as const) : ("AND" as const),
      educationLevelId: educationLevelId ? String(educationLevelId) : undefined,
      subjectId: subjectId ? String(subjectId) : undefined,
      chapterId: chapterId ? String(chapterId) : undefined,
      topicId: topicId ? String(topicId) : undefined,
      difficulty: difficulty ? (difficulty as DifficultyLevel) : undefined,
      questionType: questionType ? (questionType as QuestionType) : undefined,
      search: search ? String(search) : undefined,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      isPublished: isPublished !== undefined ? isPublished === "true" : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: sortBy ? (String(sortBy) as any) : undefined,
      sortOrder: sortOrder === "asc" ? ("asc" as const) : ("desc" as const),
    };

    const { data, meta } = await QuestionTagService.filterQuestionsByTags(filters);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Questions filtered by tags successfully",
      meta,
      data,
    });
  },
);

export const QuestionTagController = {
  attachTagsToQuestion,
  createQuestionWithTags,
  getQuestionTags,
  filterQuestionsByTags,
};
