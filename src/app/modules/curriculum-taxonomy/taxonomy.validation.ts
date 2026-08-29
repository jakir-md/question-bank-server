/**
 * @file taxonomy.validation.ts
 * @description Zod validation schemas for Curriculum Taxonomy requests.
 * Complies with Essential TypeScript Coding Standards and TSDoc documentation.
 */

import { z } from "zod";

/**
 * Zod validation schema for creating an Education Level.
 */
export const createEducationLevelZodSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .trim(),
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(30, "Code cannot exceed 30 characters")
      .trim(),
    slug: z.string().max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    icon: z.string().max(100).optional().nullable(),
    color: z.string().max(50).optional().nullable(),
    orderIndex: z.number().int().nonnegative().optional().default(0),
    isActive: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(false),
  }),
});

/**
 * Zod validation schema for updating an Education Level.
 */
export const updateEducationLevelZodSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    code: z.string().min(2).max(30).trim().optional(),
    slug: z.string().max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    icon: z.string().max(100).optional().nullable(),
    color: z.string().max(50).optional().nullable(),
    orderIndex: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
});

/**
 * Zod validation schema for creating a Subject.
 */
export const createSubjectZodSchema = z.object({
  body: z.object({
    educationLevelId: z.string().uuid("Invalid Education Level ID format"),
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .trim(),
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .max(30, "Code cannot exceed 30 characters")
      .trim(),
    slug: z.string().max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    icon: z.string().max(100).optional().nullable(),
    color: z.string().max(50).optional().nullable(),
    paper: z.string().max(50).optional().nullable(),
    subjectCode: z.string().max(30).optional().nullable(),
    orderIndex: z.number().int().nonnegative().optional().default(0),
    isActive: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(false),
  }),
});

/**
 * Zod validation schema for updating a Subject.
 */
export const updateSubjectZodSchema = z.object({
  body: z.object({
    educationLevelId: z.string().uuid("Invalid Education Level ID format").optional(),
    name: z.string().min(2).max(100).trim().optional(),
    code: z.string().min(2).max(30).trim().optional(),
    slug: z.string().max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    icon: z.string().max(100).optional().nullable(),
    color: z.string().max(50).optional().nullable(),
    paper: z.string().max(50).optional().nullable(),
    subjectCode: z.string().max(30).optional().nullable(),
    orderIndex: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
});

/**
 * Zod validation schema for creating a Chapter.
 */
export const createChapterZodSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid("Invalid Subject ID format"),
    chapterNumber: z.number().int().positive().optional().nullable(),
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(150, "Name cannot exceed 150 characters")
      .trim(),
    slug: z.string().max(150).optional(),
    description: z.string().max(1000).optional().nullable(),
    totalEstimatedHours: z.number().positive().optional().nullable(),
    weightage: z.number().min(0).max(100).optional().nullable(),
    orderIndex: z.number().int().nonnegative().optional().default(0),
    isActive: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(false),
  }),
});

/**
 * Zod validation schema for updating a Chapter.
 */
export const updateChapterZodSchema = z.object({
  body: z.object({
    subjectId: z.string().uuid("Invalid Subject ID format").optional(),
    chapterNumber: z.number().int().positive().optional().nullable(),
    name: z.string().min(2).max(150).trim().optional(),
    slug: z.string().max(150).optional(),
    description: z.string().max(1000).optional().nullable(),
    totalEstimatedHours: z.number().positive().optional().nullable(),
    weightage: z.number().min(0).max(100).optional().nullable(),
    orderIndex: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
});

/**
 * Zod validation schema for creating a Topic.
 */
export const createTopicZodSchema = z.object({
  body: z.object({
    chapterId: z.string().uuid("Invalid Chapter ID format"),
    parentTopicId: z.string().uuid("Invalid Parent Topic ID format").optional().nullable(),
    topicNumber: z.string().max(20).optional().nullable(),
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(200, "Name cannot exceed 200 characters")
      .trim(),
    slug: z.string().max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    learningObjectives: z.array(z.string()).optional().default([]),
    importanceLevel: z
      .enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"])
      .optional()
      .default("MEDIUM"),
    difficultyLevel: z
      .enum(["EASY", "MEDIUM", "HARD"])
      .optional()
      .default("MEDIUM"),
    orderIndex: z.number().int().nonnegative().optional().default(0),
    isActive: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(false),
  }),
});

/**
 * Zod validation schema for updating a Topic.
 */
export const updateTopicZodSchema = z.object({
  body: z.object({
    chapterId: z.string().uuid("Invalid Chapter ID format").optional(),
    parentTopicId: z.string().uuid("Invalid Parent Topic ID format").optional().nullable(),
    topicNumber: z.string().max(20).optional().nullable(),
    name: z.string().min(2).max(200).trim().optional(),
    slug: z.string().max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
    learningObjectives: z.array(z.string()).optional(),
    importanceLevel: z.enum(["LOW", "MEDIUM", "HIGH", "VERY_HIGH"]).optional(),
    difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    orderIndex: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
});

/**
 * Zod validation schema for reordering taxonomy items.
 */
export const reorderTaxonomyZodSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.string().uuid("Invalid ID format"),
          orderIndex: z.number().int().nonnegative(),
        }),
      )
      .min(1, "At least one item is required for reordering"),
  }),
});

export const TaxonomyValidation = {
  createEducationLevelZodSchema,
  updateEducationLevelZodSchema,
  createSubjectZodSchema,
  updateSubjectZodSchema,
  createChapterZodSchema,
  updateChapterZodSchema,
  createTopicZodSchema,
  updateTopicZodSchema,
  reorderTaxonomyZodSchema,
};
