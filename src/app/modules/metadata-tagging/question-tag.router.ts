/**
 * @file question-tag.router.ts
 * @description Express Router definitions for Question Tagging & Multi-Tag Filter endpoints.
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { QuestionTagController } from "./question-tag.controller";
import { TagValidation } from "./tag.validation";

const router = Router();

// ==========================================
// Question Tagging & Multi-Tag Filter Endpoints
// ==========================================

/**
 * @route GET /api/v1/questions/by-tags
 * @desc Filter questions by multiple custom tags (AND/OR mode) and curriculum hierarchy
 */
router.get(
  "/by-tags",
  validateRequest(TagValidation.filterQuestionsByTagsZodSchema),
  QuestionTagController.filterQuestionsByTags,
);

/**
 * @route POST /api/v1/questions
 * @desc Create a new Question with attached custom tags
 */
router.post(
  "/",
  validateRequest(TagValidation.createQuestionZodSchema),
  QuestionTagController.createQuestionWithTags,
);

/**
 * @route GET /api/v1/questions/:id/tags
 * @desc Retrieve all tags attached to a specific question
 */
router.get("/:id/tags", QuestionTagController.getQuestionTags);

/**
 * @route POST /api/v1/questions/:id/tags
 * @desc Synchronize/attach tags to a question
 */
router.post(
  "/:id/tags",
  validateRequest(TagValidation.attachTagsToQuestionZodSchema),
  QuestionTagController.attachTagsToQuestion,
);

export const QuestionRoutes = router;
