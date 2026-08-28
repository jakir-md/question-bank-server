/**
 * @file tag.router.ts
 * @description Express Router definitions for Tag endpoints.
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { TagController } from "./tag.controller";
import { TagValidation } from "./tag.validation";

const router = Router();

// ==========================================
// Specialized Tag Search & Metadata Endpoints
// ==========================================

/**
 * @route GET /api/v1/tags/autocomplete
 * @desc Fast autocomplete search for tags with prefix/keyword matching & category filtering
 */
router.get(
  "/autocomplete",
  validateRequest(TagValidation.autocompleteTagZodSchema),
  TagController.autocompleteTags,
);

/**
 * @route GET /api/v1/tags/categories
 * @desc Retrieve all tag categories with color metadata and item counts
 */
router.get("/categories", TagController.getTagCategories);

/**
 * @route GET /api/v1/tags/stats
 * @desc Retrieve overall tagging analytics and distribution
 */
router.get("/stats", TagController.getTagStats);

/**
 * @route GET /api/v1/tags/popular
 * @desc Retrieve top most frequently used tags
 */
router.get("/popular", TagController.getPopularTags);

/**
 * @route POST /api/v1/tags/bulk-create
 * @desc Bulk create or resolve tags by list of names/categories
 */
router.post(
  "/bulk-create",
  validateRequest(TagValidation.bulkCreateTagsZodSchema),
  TagController.bulkCreateTags,
);

// ==========================================
// Core Tag CRUD Endpoints
// ==========================================

/**
 * @route POST /api/v1/tags
 * @desc Create a new custom tag
 */
router.post(
  "/",
  validateRequest(TagValidation.createTagZodSchema),
  TagController.createTag,
);

/**
 * @route GET /api/v1/tags
 * @desc Retrieve paginated tags with search and category filtering
 */
router.get("/", TagController.getAllTags);

/**
 * @route GET /api/v1/tags/:id
 * @desc Retrieve a single tag by ID with question details
 */
router.get("/:id", TagController.getTagById);

/**
 * @route PATCH /api/v1/tags/:id
 * @desc Update a tag
 */
router.patch(
  "/:id",
  validateRequest(TagValidation.updateTagZodSchema),
  TagController.updateTag,
);

/**
 * @route PATCH /api/v1/tags/:id/toggle-status
 * @desc Toggle active status of a tag
 */
router.patch("/:id/toggle-status", TagController.toggleTagStatus);

/**
 * @route DELETE /api/v1/tags/:id
 * @desc Delete a tag
 */
router.delete("/:id", TagController.deleteTag);

export const TagRoutes = router;
