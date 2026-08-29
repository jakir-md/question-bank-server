/**
 * @file mcq-ingestion.router.ts
 * @description Express Router definitions for MCQ Ingestion (Single & Multi-Context).
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { MCQIngestionController } from "./mcq-ingestion.controller";
import { MCQValidation } from "./mcq-ingestion.validation";

const router = Router();

// ==========================================
// Ingestion Endpoints (Single & Multi-Context)
// ==========================================

/**
 * @route POST /api/v1/mcq-ingestion/single
 * @desc Ingest a single objective MCQ with 4 options, 1 correct answer, marks, explanation, taxonomy, and tags
 */
router.post(
  "/single",
  validateRequest(MCQValidation.createSingleMCQSchema),
  MCQIngestionController.ingestSingleMCQ,
);

/**
 * @route POST /api/v1/mcq-ingestion/multi-context
 * @desc Ingest a Multi-Context Question Package (Passage/Stem + linked Sub-Questions) in an atomic transaction
 */
router.post(
  "/multi-context",
  validateRequest(MCQValidation.createMultiContextMCQSchema),
  MCQIngestionController.ingestMultiContextMCQ,
);

/**
 * @route GET /api/v1/mcq-ingestion/stats
 * @desc Retrieve analytics and breakdown of ingested questions
 */
router.get("/stats", MCQIngestionController.getMCQStats);

// ==========================================
// Question Management & Query Endpoints
// ==========================================

/**
 * @route GET /api/v1/mcq-ingestion/questions
 * @desc Query & filter paginated MCQs by taxonomy, tags, difficulty, and context format
 */
router.get("/questions", MCQIngestionController.getMCQs);

/**
 * @route GET /api/v1/mcq-ingestion/questions/:id
 * @desc Get details of a single MCQ by UUID
 */
router.get("/questions/:id", MCQIngestionController.getMCQById);

/**
 * @route PATCH /api/v1/mcq-ingestion/questions/:id
 * @desc Update an existing MCQ item
 */
router.patch(
  "/questions/:id",
  validateRequest(MCQValidation.updateMCQSchema),
  MCQIngestionController.updateMCQ,
);

/**
 * @route DELETE /api/v1/mcq-ingestion/questions/:id
 * @desc Delete an MCQ item and update tag counts
 */
router.delete("/questions/:id", MCQIngestionController.deleteMCQ);

// ==========================================
// Question Context (Passages/Stems) Endpoints
// ==========================================

/**
 * @route GET /api/v1/mcq-ingestion/contexts
 * @desc List question contexts with pagination and question counts
 */
router.get("/contexts", MCQIngestionController.getQuestionContexts);

/**
 * @route GET /api/v1/mcq-ingestion/contexts/:id
 * @desc Get a Question Context by UUID with all its nested sub-questions
 */
router.get("/contexts/:id", MCQIngestionController.getQuestionContextById);

/**
 * @route PATCH /api/v1/mcq-ingestion/contexts/:id
 * @desc Update a Question Context
 */
router.patch(
  "/contexts/:id",
  validateRequest(MCQValidation.updateQuestionContextSchema),
  MCQIngestionController.updateQuestionContext,
);

/**
 * @route DELETE /api/v1/mcq-ingestion/contexts/:id
 * @desc Delete a Question Context and its cascaded sub-questions
 */
router.delete("/contexts/:id", MCQIngestionController.deleteQuestionContext);

export const MCQIngestionRoutes = router;
