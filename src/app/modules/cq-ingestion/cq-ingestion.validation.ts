/**
 * @file cq-ingestion.validation.ts
 * @description Zod validation schemas for Creative Question (CQ) Ingestion.
 * Enforces acceptance criteria: Uddipok stem, exactly 4 sub-questions (ক, খ, গ, ঘ),
 * individual marks (default 1, 2, 3, 4), and total marks validation (default 10 marks).
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { z } from "zod";

/**
 * Sub-question single item validation schema.
 */
export const cqSubQuestionItemSchema = z.object({
  label: z.enum(["ক", "খ", "গ", "ঘ"], {
    message: "Sub-question label must be one of: ক, খ, গ, ঘ",
  }),
  cognitiveLevel: z.enum(["KNOWLEDGE", "COMPREHENSION", "APPLICATION", "HIGHER_ABILITY"], {
    message: "Cognitive domain must be KNOWLEDGE, COMPREHENSION, APPLICATION, or HIGHER_ABILITY",
  }),
  questionText: z
    .string({
      message: "Sub-question text is required",
    })
    .trim()
    .min(1, "Sub-question text cannot be empty"),
  marks: z
    .number({
      message: "Sub-question marks must be a valid number",
    })
    .min(0.5, "Sub-question marks must be at least 0.5")
    .max(10, "Sub-question marks cannot exceed 10"),
  explanation: z.string().trim().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  topicId: z.string().uuid("Invalid Topic ID format").optional().nullable(),
  tagIds: z.array(z.string().uuid("Invalid Tag ID")).optional(),
  tagNames: z.array(z.string().trim().min(1)).optional(),
  order: z.number().int().min(1).max(4).optional(),
});

/**
 * Validates array of exactly 4 CQ sub-questions (ক, খ, গ, ঘ).
 */
export const fourSubQuestionsValidation = z
  .array(cqSubQuestionItemSchema)
  .length(4, "A Creative Question (CQ) must have exactly 4 sub-questions (ক, খ, গ, ঘ)")
  .refine(
    (questions) => questions.every((q) => q.questionText && q.questionText.trim().length > 0),
    {
      message: "All 4 sub-questions must have non-empty question text",
    },
  )
  .refine(
    (questions) => {
      const labels = questions.map((q) => q.label);
      const expectedLabels = ["ক", "খ", "গ", "ঘ"];
      return expectedLabels.every((label) => labels.includes(label as any));
    },
    {
      message: "CQ must include all 4 sub-question labels: ক (জ্ঞানমূলক), খ (অনুধাবনমূলক), গ (প্রয়োগমূলক), ঘ (উচ্চতর দক্ষতামূলক)",
    },
  );

/**
 * Schema for CQ Stimulus (Uddipok / Stem).
 */
export const cqStimulusSchema = z.object({
  title: z.string().trim().optional().nullable(),
  contextText: z
    .string({
      message: "Uddipok (stimulus/stem) text is required",
    })
    .trim()
    .min(1, "Uddipok text cannot be empty"),
  contextType: z
    .enum(["STEM", "PASSAGE", "CASE_STUDY", "COMPREHENSION", "SCENARIO", "EXPERIMENT_DATA"])
    .default("STEM"),
  mediaUrl: z.string().url("Invalid media URL format").optional().nullable().or(z.literal("")),
  educationLevelId: z.string().uuid("Invalid Education Level ID").optional().nullable(),
  subjectId: z.string().uuid("Invalid Subject ID").optional().nullable(),
  chapterId: z.string().uuid("Invalid Chapter ID").optional().nullable(),
  topicId: z.string().uuid("Invalid Topic ID").optional().nullable(),
  isActive: z.boolean().default(true),
  isPublished: z.boolean().default(true),
});

/**
 * Schema for Ingesting a Creative Question (CQ) Set.
 * Enforces total marks validation (default: 10 marks per set).
 */
export const createCQSchema = z.object({
  body: z
    .object({
      stimulus: cqStimulusSchema,
      questions: fourSubQuestionsValidation,
      totalMarks: z.number().min(1).max(100).default(10.0),
      commonTagIds: z.array(z.string().uuid()).optional(),
      commonTagNames: z.array(z.string().trim().min(1)).optional(),
    })
    .refine(
      (data) => {
        const sumMarks = data.questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
        const expectedTotal = Number(data.totalMarks || 10.0);
        // Compare with small epsilon for floating point accuracy
        return Math.abs(sumMarks - expectedTotal) < 0.01;
      },
      {
        message: "The sum of sub-question marks must equal the total CQ marks",
        path: ["questions"],
      },
    ),
});

/**
 * Schema for Updating a CQ Set.
 */
export const updateCQSchema = z.object({
  body: z
    .object({
      stimulus: cqStimulusSchema.partial().optional(),
      questions: z.array(cqSubQuestionItemSchema).optional(),
      totalMarks: z.number().min(1).max(100).optional(),
      commonTagIds: z.array(z.string().uuid()).optional(),
      commonTagNames: z.array(z.string().trim().min(1)).optional(),
    })
    .refine(
      (data) => {
        if (!data.questions || data.questions.length === 0) return true;
        if (data.totalMarks !== undefined) {
          const sumMarks = data.questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
          return Math.abs(sumMarks - data.totalMarks) < 0.01;
        }
        return true;
      },
      {
        message: "The sum of sub-question marks must equal the total CQ marks",
        path: ["questions"],
      },
    ),
});

export const CQValidation = {
  createCQSchema,
  updateCQSchema,
  cqStimulusSchema,
  cqSubQuestionItemSchema,
  fourSubQuestionsValidation,
};
