/**
 * @file taxonomy.router.ts
 * @description Express Router definitions for Curriculum Taxonomy endpoints.
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { EducationLevelController } from "./education-level/education-level.controller";
import { SubjectController } from "./subject/subject.controller";
import { ChapterController } from "./chapter/chapter.controller";
import { TopicController } from "./topic/topic.controller";
import { TaxonomyTreeController } from "./taxonomy-tree/taxonomy-tree.controller";
import { TaxonomyValidation } from "./taxonomy.validation";

const router = Router();

// ==========================================
// Full Hierarchy Tree, Lineage & Analytics
// ==========================================

/**
 * @route GET /api/v1/curriculum-taxonomy/tree
 * @desc Retrieve complete nested 4-tier taxonomy tree
 */
router.get("/tree", TaxonomyTreeController.getFullTaxonomyTree);

/**
 * @route GET /api/v1/curriculum-taxonomy/stats
 * @desc Retrieve aggregated curriculum taxonomy analytics & metrics
 */
router.get("/stats", TaxonomyTreeController.getTaxonomyStats);

/**
 * @route GET /api/v1/curriculum-taxonomy/topics/:topicId/lineage
 * @desc Resolve full breadcrumb lineage from Topic back to Level
 */
router.get("/topics/:topicId/lineage", TaxonomyTreeController.getTopicLineage);

// ==========================================
// Education Levels Endpoints (Tier 1)
// ==========================================

router.post(
  "/education-levels/reorder",
  validateRequest(TaxonomyValidation.reorderTaxonomyZodSchema),
  EducationLevelController.reorderEducationLevels,
);

router.post(
  "/education-levels",
  validateRequest(TaxonomyValidation.createEducationLevelZodSchema),
  EducationLevelController.createEducationLevel,
);

router.get("/education-levels", EducationLevelController.getAllEducationLevels);

router.get("/education-levels/:id", EducationLevelController.getEducationLevelById);

router.patch(
  "/education-levels/:id",
  validateRequest(TaxonomyValidation.updateEducationLevelZodSchema),
  EducationLevelController.updateEducationLevel,
);

router.patch(
  "/education-levels/:id/toggle-status",
  EducationLevelController.toggleEducationLevelStatus,
);

router.delete("/education-levels/:id", EducationLevelController.deleteEducationLevel);

// ==========================================
// Subjects Endpoints (Tier 2)
// ==========================================

router.post(
  "/subjects/reorder",
  validateRequest(TaxonomyValidation.reorderTaxonomyZodSchema),
  SubjectController.reorderSubjects,
);

router.post(
  "/subjects",
  validateRequest(TaxonomyValidation.createSubjectZodSchema),
  SubjectController.createSubject,
);

router.get("/subjects", SubjectController.getAllSubjects);

router.get("/subjects/:id", SubjectController.getSubjectById);

router.patch(
  "/subjects/:id",
  validateRequest(TaxonomyValidation.updateSubjectZodSchema),
  SubjectController.updateSubject,
);

router.patch("/subjects/:id/toggle-status", SubjectController.toggleSubjectStatus);

router.delete("/subjects/:id", SubjectController.deleteSubject);

// ==========================================
// Chapters Endpoints (Tier 3)
// ==========================================

router.post(
  "/chapters/reorder",
  validateRequest(TaxonomyValidation.reorderTaxonomyZodSchema),
  ChapterController.reorderChapters,
);

router.post(
  "/chapters",
  validateRequest(TaxonomyValidation.createChapterZodSchema),
  ChapterController.createChapter,
);

router.get("/chapters", ChapterController.getAllChapters);

router.get("/chapters/:id", ChapterController.getChapterById);

router.patch(
  "/chapters/:id",
  validateRequest(TaxonomyValidation.updateChapterZodSchema),
  ChapterController.updateChapter,
);

router.patch("/chapters/:id/toggle-status", ChapterController.toggleChapterStatus);

router.delete("/chapters/:id", ChapterController.deleteChapter);

// ==========================================
// Topics Endpoints (Tier 4)
// ==========================================

router.post(
  "/topics/reorder",
  validateRequest(TaxonomyValidation.reorderTaxonomyZodSchema),
  TopicController.reorderTopics,
);

router.post(
  "/topics",
  validateRequest(TaxonomyValidation.createTopicZodSchema),
  TopicController.createTopic,
);

router.get("/topics", TopicController.getAllTopics);

router.get("/topics/:id", TopicController.getTopicById);

router.patch(
  "/topics/:id",
  validateRequest(TaxonomyValidation.updateTopicZodSchema),
  TopicController.updateTopic,
);

router.patch("/topics/:id/toggle-status", TopicController.toggleTopicStatus);

router.delete("/topics/:id", TopicController.deleteTopic);

export const CurriculumTaxonomyRoutes = router;
