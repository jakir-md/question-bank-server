/**
 * @file mcq-ingestion.validation.ts
 * @description Zod validation schemas for MCQ Ingestion (Single & Multi-Context).
 * Enforces acceptance criteria: 4 options, all non-empty, exactly 1 correct answer, rich text question body, marks, explanation, taxonomy, and tags.
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { z } from "zod";

/**
 * Schema for validating individual MCQ Option item.
 */
export const mcqOptionSchema = z.object({
  id: z.string({
    message: "Option ID (e.g. A, B, C, D) is required",
  }).min(1, "Option ID cannot be empty"),
  text: z.string({
    message: "Option text is required",
  }).trim().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean().default(false),
});

/**
 * Validates array of 4 options with acceptance criteria:
 * 1. Exactly 4 options (A, B, C, D)
 * 2. Exactly one option has isCorrect: true
 * 3. All 4 options are non-empty
 */
const fourOptionsValidation = z
  .array(mcqOptionSchema)
  .length(4, "Exactly 4 options (A, B, C, D) are required")
  .refine(
    (options) => options.every((opt) => opt.text && opt.text.trim().length > 0),
    {
      message: "All 4 options must be non-empty",
    },
  )
  .refine(
    (options) => options.filter((opt) => opt.isCorrect).length === 1,
    {
      message: "Exactly one correct option must be selected",
    },
  );

/**
 * Schema for Single MCQ Ingestion.
 */
export const createSingleMCQSchema = z.object({
  body: z.object({
    questionText: z
      .string({
        message: "Question text is required",
      })
      .trim()
      .min(1, "Question text cannot be empty"),
    questionType: z.enum(["MCQ", "CQ", "SHORT_ANSWER", "TRUE_FALSE"]).default("MCQ"),
    options: fourOptionsValidation,
    correctAnswer: z.string().optional(),
    marks: z
      .number({
        message: "Marks must be a valid number",
      })
      .min(0.1, "Marks must be greater than 0")
      .default(1.0),
    negativeMarks: z
      .number({
        message: "Negative marks must be a valid number",
      })
      .min(0, "Negative marks cannot be negative")
      .default(0.25),
    explanation: z.string().trim().optional().nullable(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    educationLevelId: z.string().uuid("Invalid Education Level ID format").optional().nullable(),
    subjectId: z.string().uuid("Invalid Subject ID format").optional().nullable(),
    chapterId: z.string().uuid("Invalid Chapter ID format").optional().nullable(),
    topicId: z.string().uuid("Invalid Topic ID format").optional().nullable(),
    contextId: z.string().uuid("Invalid Context ID format").optional().nullable(),
    contextOrder: z.number().int().min(0).optional().nullable(),
    tagIds: z.array(z.string().uuid("Invalid Tag ID")).optional(),
    tagNames: z.array(z.string().trim().min(1)).optional(),
    isActive: z.boolean().default(true),
    isPublished: z.boolean().default(true),
  }),
});

/**
 * Schema for individual sub-question inside Multi-Context Ingestion.
 */
export const subQuestionSchema = z.object({
  questionText: z
    .string({
      message: "Question text is required",
    })
    .trim()
    .min(1, "Question text cannot be empty"),
  questionType: z.enum(["MCQ", "CQ", "SHORT_ANSWER", "TRUE_FALSE"]).default("MCQ"),
  options: fourOptionsValidation,
  correctAnswer: z.string().optional(),
  marks: z.number().min(0.1, "Marks must be greater than 0").default(1.0),
  negativeMarks: z.number().min(0).default(0.25),
  explanation: z.string().trim().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  topicId: z.string().uuid("Invalid Topic ID format").optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional(),
  tagNames: z.array(z.string().trim().min(1)).optional(),
  order: z.number().int().min(1).optional(),
});

/**
 * Schema for Multi-Context Question Ingestion (Passage/Stem + Sub-Questions).
 */
export const createMultiContextMCQSchema = z.object({
  body: z.object({
    context: z.object({
      title: z.string().trim().optional().nullable(),
      contextText: z
        .string({
          message: "Context / passage text is required",
        })
        .trim()
        .min(1, "Context / passage text cannot be empty"),
      contextType: z
        .enum(["PASSAGE", "CASE_STUDY", "COMPREHENSION", "SCENARIO", "EXPERIMENT_DATA", "STEM"])
        .default("PASSAGE"),
      mediaUrl: z.string().url("Invalid media URL").optional().nullable().or(z.literal("")),
      educationLevelId: z.string().uuid("Invalid Education Level ID").optional().nullable(),
      subjectId: z.string().uuid("Invalid Subject ID").optional().nullable(),
      chapterId: z.string().uuid("Invalid Chapter ID").optional().nullable(),
      topicId: z.string().uuid("Invalid Topic ID").optional().nullable(),
      isActive: z.boolean().default(true),
      isPublished: z.boolean().default(true),
    }),
    questions: z
      .array(subQuestionSchema)
      .min(1, "At least one sub-question is required for multi-context ingestion"),
    commonTagIds: z.array(z.string().uuid()).optional(),
    commonTagNames: z.array(z.string().trim().min(1)).optional(),
  }),
});

/**
 * Schema for Updating an MCQ.
 */
export const updateMCQSchema = z.object({
  body: z.object({
    questionText: z.string().trim().min(1).optional(),
    questionType: z.enum(["MCQ", "CQ", "SHORT_ANSWER", "TRUE_FALSE"]).optional(),
    options: fourOptionsValidation.optional(),
    correctAnswer: z.string().optional(),
    marks: z.number().min(0.1).optional(),
    negativeMarks: z.number().min(0).optional(),
    explanation: z.string().trim().optional().nullable(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    educationLevelId: z.string().uuid().optional().nullable(),
    subjectId: z.string().uuid().optional().nullable(),
    chapterId: z.string().uuid().optional().nullable(),
    topicId: z.string().uuid().optional().nullable(),
    contextId: z.string().uuid().optional().nullable(),
    contextOrder: z.number().int().min(0).optional().nullable(),
    tagIds: z.array(z.string().uuid()).optional(),
    tagNames: z.array(z.string().trim().min(1)).optional(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
});

/**
 * Schema for Updating a Question Context.
 */
export const updateQuestionContextSchema = z.object({
  body: z.object({
    title: z.string().trim().optional().nullable(),
    contextText: z.string().trim().min(1).optional(),
    contextType: z
      .enum(["PASSAGE", "CASE_STUDY", "COMPREHENSION", "SCENARIO", "EXPERIMENT_DATA", "STEM"])
      .optional(),
    mediaUrl: z.string().url().optional().nullable().or(z.literal("")),
    educationLevelId: z.string().uuid().optional().nullable(),
    subjectId: z.string().uuid().optional().nullable(),
    chapterId: z.string().uuid().optional().nullable(),
    topicId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const MCQValidation = {
  createSingleMCQSchema,
  createMultiContextMCQSchema,
  updateMCQSchema,
  updateQuestionContextSchema,
  fourOptionsValidation,
};
