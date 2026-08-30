/**
 * @file cq-ingestion.router.ts
 * @description Express Router definitions for Creative Question (CQ) Ingestion.
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { CQIngestionController } from "./cq-ingestion.controller";
import { CQValidation } from "./cq-ingestion.validation";

const router = Router();

// ==========================================
// Ingestion & Stats Endpoints
// ==========================================

/**
 * @route POST /api/v1/cq-ingestion/create
 * @desc Ingest a complete Creative Question set (Uddipok + 4 Sub-questions ক, খ, গ, ঘ) in an atomic transaction
 */
router.post(
  "/create",
  validateRequest(CQValidation.createCQSchema),
  CQIngestionController.ingestCQ,
);

/**
 * @route GET /api/v1/cq-ingestion/stats
 * @desc Retrieve analytics, cognitive distribution, and breakdown of ingested CQ items
 */
router.get("/stats", CQIngestionController.getCQStats);

// ==========================================
// CQ Management & Query Endpoints
// ==========================================

/**
 * @route GET /api/v1/cq-ingestion/questions
 * @desc Query & filter paginated CQ packages by taxonomy, tags, and cognitive difficulty
 */
router.get("/questions", CQIngestionController.getCQs);

/**
 * @route GET /api/v1/cq-ingestion/questions/:id
 * @desc Get details of a single Creative Question set by UUID (Uddipok + 4 sub-questions)
 */
router.get("/questions/:id", CQIngestionController.getCQById);

/**
 * @route PATCH /api/v1/cq-ingestion/questions/:id
 * @desc Update an existing Creative Question set (Uddipok and/or sub-questions)
 */
router.patch(
  "/questions/:id",
  validateRequest(CQValidation.updateCQSchema),
  CQIngestionController.updateCQ,
);

/**
 * @route DELETE /api/v1/cq-ingestion/questions/:id
 * @desc Delete a Creative Question set and its nested sub-questions
 */
router.delete("/questions/:id", CQIngestionController.deleteCQ);

export const CQIngestionRoutes = router;
