/**
 * @file tag.validation.test.ts
 * @description Unit tests for Metadata & Tagging Zod validation schemas.
 */

import { describe, expect, it } from "vitest";
import { TagValidation } from "../tag.validation";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("Tag Zod Validation Schemas", () => {
  describe("createTagZodSchema", () => {
    it("should validate a valid tag payload with defaults", () => {
      const payload = {
        body: {
          name: "Dhaka Board 2024",
          category: "BOARD_EXAM",
          color: "#3B82F6",
          description: "Questions from Dhaka Board exam 2024",
        },
      };

      const result = TagValidation.createTagZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.isActive).toBe(true);
        expect(result.data.body.category).toBe("BOARD_EXAM");
      }
    });

    it("should reject tag names with less than 2 characters", () => {
      const payload = {
        body: {
          name: "A",
        },
      };

      const result = TagValidation.createTagZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 2 characters");
      }
    });

    it("should reject an invalid hex color code", () => {
      const payload = {
        body: {
          name: "Invalid Color Tag",
          color: "blue", // Not a valid #HEX code
        },
      };

      const result = TagValidation.createTagZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("should reject an invalid category enum", () => {
      const payload = {
        body: {
          name: "Some Tag",
          category: "NON_EXISTENT_CATEGORY",
        },
      };

      const result = TagValidation.createTagZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("autocompleteTagZodSchema", () => {
    it("should parse autocomplete query with limit and coerce onlyActive boolean", () => {
      const payload = {
        query: {
          query: "Dhaka",
          category: "BOARD_EXAM",
          limit: "5",
          onlyActive: "true",
        },
      };

      const result = TagValidation.autocompleteTagZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.limit).toBe(5);
        expect(result.data.query.onlyActive).toBe(true);
      }
    });

    it("should reject empty autocomplete query", () => {
      const payload = {
        query: {
          query: "",
        },
      };

      const result = TagValidation.autocompleteTagZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("bulkCreateTagsZodSchema", () => {
    it("should accept an array of valid tags", () => {
      const payload = {
        body: {
          tags: [
            { name: "BUET 2023", category: "ADMISSION_TEST", color: "#F59E0B" },
            { name: "Medical 2024", category: "ADMISSION_TEST", color: "#EF4444" },
          ],
        },
      };

      const result = TagValidation.bulkCreateTagsZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject empty tags array in bulk creation", () => {
      const payload = {
        body: {
          tags: [],
        },
      };

      const result = TagValidation.bulkCreateTagsZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("attachTagsToQuestionZodSchema", () => {
    it("should validate tagIds and tagNames", () => {
      const payload = {
        body: {
          tagIds: [VALID_UUID],
          tagNames: ["New Custom Tag"],
          replaceExisting: false,
        },
      };

      const result = TagValidation.attachTagsToQuestionZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUIDs in tagIds", () => {
      const payload = {
        body: {
          tagIds: ["not-a-uuid"],
        },
      };

      const result = TagValidation.attachTagsToQuestionZodSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe("filterQuestionsByTagsZodSchema", () => {
    it("should accept valid tag filter parameters", () => {
      const payload = {
        query: {
          tags: "dhaka-board,hsc-2024",
          operator: "AND",
          difficulty: "HARD",
          page: "2",
          limit: "20",
          sortBy: "marks",
          sortOrder: "asc",
        },
      };

      const result = TagValidation.filterQuestionsByTagsZodSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.operator).toBe("AND");
        expect(result.data.query.page).toBe(2);
        expect(result.data.query.limit).toBe(20);
      }
    });
  });
});
