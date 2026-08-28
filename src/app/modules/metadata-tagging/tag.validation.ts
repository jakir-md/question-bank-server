/**
 * @file tag.validation.ts
 * @description Zod validation schemas for Metadata & Tagging requests.
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { z } from "zod";

/**
 * Zod validation schema for creating a new Tag.
 */
export const createTagZodSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Tag name must be at least 2 characters")
      .max(80, "Tag name cannot exceed 80 characters")
      .trim(),
    slug: z
      .string()
      .min(2, "Slug must be at least 2 characters")
      .max(100, "Slug cannot exceed 100 characters")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe (lowercase alphanumeric & hyphens)")
      .optional(),
    category: z
      .enum([
        "BOARD_EXAM",
        "CADET_COLLEGE",
        "ADMISSION_TEST",
        "INSTITUTION",
        "DIFFICULTY",
        "EXAM_YEAR",
        "TOPIC_SPECIAL",
        "CUSTOM",
      ])
      .optional()
      .default("CUSTOM"),
    description: z.string().max(500, "Description cannot exceed 500 characters").optional().nullable(),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex color code (e.g. #3B82F6)")
      .optional()
      .nullable(),
    icon: z.string().max(50).optional().nullable(),
    isActive: z.boolean().optional().default(true),
  }),
});

/**
 * Zod validation schema for updating an existing Tag.
 */
export const updateTagZodSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Tag name must be at least 2 characters")
      .max(80, "Tag name cannot exceed 80 characters")
      .trim()
      .optional(),
    slug: z
      .string()
      .min(2, "Slug must be at least 2 characters")
      .max(100, "Slug cannot exceed 100 characters")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe (lowercase alphanumeric & hyphens)")
      .optional(),
    category: z
      .enum([
        "BOARD_EXAM",
        "CADET_COLLEGE",
        "ADMISSION_TEST",
        "INSTITUTION",
        "DIFFICULTY",
        "EXAM_YEAR",
        "TOPIC_SPECIAL",
        "CUSTOM",
      ])
      .optional(),
    description: z.string().max(500, "Description cannot exceed 500 characters").nullable().optional(),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code")
      .nullable()
      .optional(),
    icon: z.string().max(50).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

/**
 * Zod validation schema for Tag Autocomplete query.
 */
export const autocompleteTagZodSchema = z.object({
  query: z.object({
    query: z.string().min(1, "Query string cannot be empty"),
    category: z
      .enum([
        "BOARD_EXAM",
        "CADET_COLLEGE",
        "ADMISSION_TEST",
        "INSTITUTION",
        "DIFFICULTY",
        "EXAM_YEAR",
        "TOPIC_SPECIAL",
        "CUSTOM",
      ])
      .optional(),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
    onlyActive: z
      .string()
      .optional()
      .transform((val) => (val !== undefined ? val === "true" : true)),
  }),
});

/**
 * Zod validation schema for Bulk Tag Creation.
 */
export const bulkCreateTagsZodSchema = z.object({
  body: z.object({
    tags: z
      .array(
        z.object({
          name: z.string().min(2).max(80).trim(),
          category: z
            .enum([
              "BOARD_EXAM",
              "CADET_COLLEGE",
              "ADMISSION_TEST",
              "INSTITUTION",
              "DIFFICULTY",
              "EXAM_YEAR",
              "TOPIC_SPECIAL",
              "CUSTOM",
            ])
            .optional()
            .default("CUSTOM"),
          color: z
            .string()
            .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
            .optional()
            .nullable(),
          description: z.string().max(500).optional().nullable(),
        }),
      )
      .min(1, "Must provide at least one tag"),
  }),
});

/**
 * Zod validation schema for Attaching Tags to Question.
 */
export const attachTagsToQuestionZodSchema = z.object({
  body: z.object({
    tagIds: z.array(z.string().uuid("Invalid Tag UUID")).optional(),
    tagNames: z.array(z.string().min(2).max(80).trim()).optional(),
    replaceExisting: z.boolean().optional().default(true),
  }),
});

/**
 * Zod validation schema for Question creation with tags.
 */
export const createQuestionZodSchema = z.object({
  body: z.object({
    educationLevelId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    chapterId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    questionText: z.string().min(3, "Question text must be at least 3 characters").trim(),
    questionType: z.enum(["MCQ", "CQ", "SHORT_ANSWER", "TRUE_FALSE"]).optional().default("MCQ"),
    options: z
      .array(
        z.object({
          id: z.string(),
          text: z.string().min(1),
          isCorrect: z.boolean(),
          explanation: z.string().optional(),
        }),
      )
      .optional(),
    correctAnswer: z.string().optional(),
    explanation: z.string().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().default("MEDIUM"),
    marks: z.number().min(0).optional().default(1.0),
    negativeMarks: z.number().min(0).optional().default(0.25),
    isActive: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(true),
    tagIds: z.array(z.string().uuid()).optional(),
    tagNames: z.array(z.string().min(2).max(80).trim()).optional(),
  }),
});

/**
 * Zod validation schema for filtering questions by tags and curriculum.
 */
export const filterQuestionsByTagsZodSchema = z.object({
  query: z.object({
    tags: z.string().optional(), // Comma-separated list of tag slugs or IDs
    operator: z.enum(["AND", "OR"]).optional().default("AND"),
    educationLevelId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    chapterId: z.string().uuid().optional(),
    topicId: z.string().uuid().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    questionType: z.enum(["MCQ", "CQ", "SHORT_ANSWER", "TRUE_FALSE"]).optional(),
    search: z.string().optional(),
    isActive: z.string().optional(),
    isPublished: z.string().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(10),
    sortBy: z.enum(["createdAt", "difficulty", "marks"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});

export const TagValidation = {
  createTagZodSchema,
  updateTagZodSchema,
  autocompleteTagZodSchema,
  bulkCreateTagsZodSchema,
  attachTagsToQuestionZodSchema,
  createQuestionZodSchema,
  filterQuestionsByTagsZodSchema,
};
