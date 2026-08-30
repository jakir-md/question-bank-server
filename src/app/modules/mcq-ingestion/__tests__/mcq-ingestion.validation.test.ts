/**
 * @file mcq-ingestion.validation.test.ts
 * @description Unit tests for MCQ Ingestion (Single & Multi-Context) Zod validation schemas.
 * Enforces business criteria: exactly 4 options, exactly 1 correct answer, all non-empty options, marks, difficulty, and taxonomy.
 */

import { describe, expect, it } from "vitest";
import { MCQValidation } from "../mcq-ingestion.validation";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

const validFourOptions = [
  { id: "A", text: "Speed of light in vacuum", isCorrect: true },
  { id: "B", text: "Speed of sound in air", isCorrect: false },
  { id: "C", text: "Acceleration due to gravity", isCorrect: false },
  { id: "D", text: "Gravitational constant", isCorrect: false },
];

describe("MCQ Ingestion Zod Validation Schemas", () => {
  describe("fourOptionsValidation & Acceptance Criteria", () => {
    it("should accept valid 4 non-empty options with exactly 1 correct answer", () => {
      const result = MCQValidation.fourOptionsValidation.safeParse(validFourOptions);
      expect(result.success).toBe(true);
    });

    it("should reject options array with fewer than 4 options", () => {
      const invalidOptions = [
        { id: "A", text: "Option 1", isCorrect: true },
        { id: "B", text: "Option 2", isCorrect: false },
        { id: "C", text: "Option 3", isCorrect: false },
      ];

      const result = MCQValidation.fourOptionsValidation.safeParse(invalidOptions);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Exactly 4 options");
      }
    });

    it("should reject options array with more than 4 options", () => {
      const invalidOptions = [
        ...validFourOptions,
        { id: "E", text: "Option 5", isCorrect: false },
      ];

      const result = MCQValidation.fourOptionsValidation.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });

    it("should reject options if any option has empty or whitespace-only text", () => {
      const invalidOptions = [
        { id: "A", text: "Option A", isCorrect: true },
        { id: "B", text: "   ", isCorrect: false },
        { id: "C", text: "Option C", isCorrect: false },
        { id: "D", text: "Option D", isCorrect: false },
      ];

      const result = MCQValidation.fourOptionsValidation.safeParse(invalidOptions);
      expect(result.success).toBe(false);
    });

    it("should reject options if no option is marked as correct", () => {
      const noCorrectOption = validFourOptions.map((opt) => ({ ...opt, isCorrect: false }));
      const result = MCQValidation.fourOptionsValidation.safeParse(noCorrectOption);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Exactly one correct option must be selected");
      }
    });

    it("should reject options if multiple options are marked as correct", () => {
      const multipleCorrect = validFourOptions.map((opt) => ({ ...opt, isCorrect: true }));
      const result = MCQValidation.fourOptionsValidation.safeParse(multipleCorrect);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Exactly one correct option must be selected");
      }
    });
  });

  describe("createSingleMCQSchema", () => {
    it("should accept a valid Single MCQ payload with full metadata", () => {
      const payload = {
        body: {
          questionText: "Which of the following physical quantities is a scalar?",
          options: validFourOptions,
          marks: 1.0,
          negativeMarks: 0.25,
          explanation: "Scalar quantities have magnitude but no direction.",
          difficulty: "EASY",
          educationLevelId: VALID_UUID,
          subjectId: VALID_UUID,
          chapterId: VALID_UUID,
          topicId: VALID_UUID,
          tagNames: ["Physics 1st Paper", "HSC 2024"],
        },
      };

      const result = MCQValidation.createSingleMCQSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.difficulty).toBe("EASY");
        expect(result.data.body.marks).toBe(1.0);
        expect(result.data.body.negativeMarks).toBe(0.25);
      }
    });

    it("should reject payload with empty questionText", () => {
      const payload = {
        body: {
          questionText: "   ",
          options: validFourOptions,
        },
      };

      const result = MCQValidation.createSingleMCQSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject payload with negative marks less than or equal to 0", () => {
      const payload = {
        body: {
          questionText: "Sample Question?",
          options: validFourOptions,
          marks: 0, // Marks must be > 0
        },
      };

      const result = MCQValidation.createSingleMCQSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("createMultiContextMCQSchema", () => {
    it("should accept a valid Multi-Context question package with passage and sub-questions", () => {
      const payload = {
        body: {
          context: {
            title: "Newton's Laws Scenario",
            contextText: "A 5kg block rests on a frictionless horizontal plane...",
            contextType: "SCENARIO",
            educationLevelId: VALID_UUID,
            subjectId: VALID_UUID,
            chapterId: VALID_UUID,
          },
          questions: [
            {
              questionText: "What is the normal force exerted by the surface?",
              options: validFourOptions,
              marks: 1.0,
              difficulty: "MEDIUM",
              order: 1,
            },
            {
              questionText: "If an external force of 20N is applied horizontally, what is the acceleration?",
              options: validFourOptions,
              marks: 1.0,
              difficulty: "HARD",
              order: 2,
            },
          ],
          commonTagNames: ["Newtonian Mechanics", "Admission Standard"],
        },
      };

      const result = MCQValidation.createMultiContextMCQSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.questions).toHaveLength(2);
        expect(result.data.body.context.contextType).toBe("SCENARIO");
      }
    });

    it("should reject multi-context package with empty sub-questions array", () => {
      const payload = {
        body: {
          context: {
            contextText: "Some passage text...",
          },
          questions: [], // Empty sub-questions
        },
      };

      const result = MCQValidation.createMultiContextMCQSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("updateMCQSchema", () => {
    it("should validate partial updates to an existing MCQ", () => {
      const payload = {
        body: {
          questionText: "Updated question body text?",
          difficulty: "HARD",
          marks: 2.0,
        },
      };

      const result = MCQValidation.updateMCQSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});
