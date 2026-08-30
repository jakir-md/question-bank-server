/**
 * @file taxonomy.validation.test.ts
 * @description Unit tests for Curriculum Taxonomy Zod validation schemas.
 */

import { describe, expect, it } from "vitest";
import { TaxonomyValidation } from "../taxonomy.validation";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("Taxonomy Zod Validation Schemas", () => {
  describe("Education Level Validation", () => {
    it("should accept a valid Education Level payload", () => {
      const payload = {
        body: {
          name: "Higher Secondary Certificate",
          code: "HSC",
          description: "Grades 11 and 12 curriculum",
          orderIndex: 1,
          isActive: true,
          isPublished: true,
        },
      };

      const result = TaxonomyValidation.createEducationLevelZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject an Education Level with name < 2 characters", () => {
      const payload = {
        body: {
          name: "H",
          code: "HSC",
        },
      };

      const result = TaxonomyValidation.createEducationLevelZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 2 characters");
      }
    });

    it("should allow partial updates in updateEducationLevelZodSchema", () => {
      const payload = {
        body: {
          name: "Updated HSC",
          isActive: false,
        },
      };

      const result = TaxonomyValidation.updateEducationLevelZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("Subject Validation", () => {
    it("should accept a valid Subject payload", () => {
      const payload = {
        body: {
          educationLevelId: VALID_UUID,
          name: "Physics",
          code: "PHY-101",
          paper: "1st Paper",
          orderIndex: 0,
        },
      };

      const result = TaxonomyValidation.createSubjectZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject an invalid UUID for educationLevelId", () => {
      const payload = {
        body: {
          educationLevelId: "invalid-not-a-uuid",
          name: "Physics",
          code: "PHY-101",
        },
      };

      const result = TaxonomyValidation.createSubjectZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid Education Level ID format");
      }
    });
  });

  describe("Chapter Validation", () => {
    it("should accept a valid Chapter payload with optional fields", () => {
      const payload = {
        body: {
          subjectId: VALID_UUID,
          chapterNumber: 1,
          name: "Vector Analysis",
          totalEstimatedHours: 12.5,
          weightage: 15,
        },
      };

      const result = TaxonomyValidation.createChapterZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject negative chapter numbers or weightage > 100", () => {
      const payload = {
        body: {
          subjectId: VALID_UUID,
          chapterNumber: -1,
          name: "Invalid Chapter",
          weightage: 150,
        },
      };

      const result = TaxonomyValidation.createChapterZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("Topic Validation", () => {
    it("should accept a valid Topic with default enum values", () => {
      const payload = {
        body: {
          chapterId: VALID_UUID,
          name: "Dot and Cross Product",
          importanceLevel: "VERY_HIGH",
          difficultyLevel: "HARD",
          learningObjectives: ["Understand scalar product", "Solve 3D vector angles"],
        },
      };

      const result = TaxonomyValidation.createTopicZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject invalid importanceLevel or difficultyLevel enums", () => {
      const payload = {
        body: {
          chapterId: VALID_UUID,
          name: "Subtopic",
          importanceLevel: "SUPER_IMPORTANT", // Invalid enum
        },
      };

      const result = TaxonomyValidation.createTopicZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("Reordering Validation", () => {
    it("should accept a valid list of reordered items", () => {
      const payload = {
        body: {
          items: [
            { id: VALID_UUID, orderIndex: 0 },
            { id: "223e4567-e89b-12d3-a456-426614174001", orderIndex: 1 },
          ],
        },
      };

      const result = TaxonomyValidation.reorderTaxonomyZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject an empty items array for reordering", () => {
      const payload = {
        body: {
          items: [],
        },
      };

      const result = TaxonomyValidation.reorderTaxonomyZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
