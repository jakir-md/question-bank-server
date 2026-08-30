/**
 * @file tag.utils.test.ts
 * @description Unit tests for Metadata & Tagging utility functions, default styling, and pagination.
 */

import { TagCategory } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  calculatePagination,
  getDefaultCategoryColor,
  getDefaultCategoryIcon,
  slugify,
  TAG_CATEGORY_METADATA,
} from "../tag.utils";

describe("Metadata & Tagging Utilities", () => {
  describe("slugify", () => {
    it("should convert normal text into a lowercase hyphenated slug", () => {
      expect(slugify("Dhaka Board 2024")).toBe("dhaka-board-2024");
    });

    it("should remove special characters and punctuation", () => {
      expect(slugify("BUET & Medical (Top Selection!)")).toBe("buet-medical-top-selection");
    });

    it("should collapse multiple consecutive spaces and hyphens", () => {
      expect(slugify("   Notre Dame   -- College --- ")).toBe("notre-dame-college");
    });

    it("should trim leading and trailing hyphens", () => {
      expect(slugify("-Faujdarhat Cadet College-")).toBe("faujdarhat-cadet-college");
    });
  });

  describe("calculatePagination", () => {
    it("should return default pagination when arguments are omitted", () => {
      const result = calculatePagination();
      expect(result).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      });
    });

    it("should compute correct skip for page 4 with limit 15", () => {
      const result = calculatePagination(4, 15);
      expect(result).toEqual({
        page: 4,
        limit: 15,
        skip: 45,
        take: 15,
      });
    });

    it("should clamp limit to a maximum of 100", () => {
      const result = calculatePagination(1, 250);
      expect(result.limit).toBe(100);
      expect(result.take).toBe(100);
    });

    it("should handle negative and invalid inputs safely", () => {
      const result = calculatePagination(-3, -20);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(1);
    });
  });

  describe("TAG_CATEGORY_METADATA & Styling Helpers", () => {
    it("should define metadata for all 8 TagCategory enums", () => {
      const categories: TagCategory[] = [
        TagCategory.BOARD_EXAM,
        TagCategory.CADET_COLLEGE,
        TagCategory.ADMISSION_TEST,
        TagCategory.INSTITUTION,
        TagCategory.DIFFICULTY,
        TagCategory.EXAM_YEAR,
        TagCategory.TOPIC_SPECIAL,
        TagCategory.CUSTOM,
      ];

      for (const cat of categories) {
        expect(TAG_CATEGORY_METADATA[cat]).toBeDefined();
        expect(TAG_CATEGORY_METADATA[cat].label).toBeTruthy();
        expect(TAG_CATEGORY_METADATA[cat].color).toMatch(/^#([0-9a-fA-F]{6})$/);
        expect(TAG_CATEGORY_METADATA[cat].icon).toBeTruthy();
      }
    });

    it("should return category-specific color when provided", () => {
      expect(getDefaultCategoryColor(TagCategory.BOARD_EXAM)).toBe("#3B82F6");
      expect(getDefaultCategoryColor(TagCategory.ADMISSION_TEST)).toBe("#F59E0B");
    });

    it("should fallback to CUSTOM color when category is undefined or invalid", () => {
      expect(getDefaultCategoryColor(undefined)).toBe("#64748B");
      // @ts-expect-error Testing runtime fallback
      expect(getDefaultCategoryColor("NON_EXISTENT_CAT")).toBe("#64748B");
    });

    it("should return category-specific icon when provided", () => {
      expect(getDefaultCategoryIcon(TagCategory.CADET_COLLEGE)).toBe("ShieldCheck");
      expect(getDefaultCategoryIcon(TagCategory.EXAM_YEAR)).toBe("Calendar");
    });

    it("should fallback to CUSTOM icon when category is undefined or invalid", () => {
      expect(getDefaultCategoryIcon(undefined)).toBe("Tag");
      // @ts-expect-error Testing runtime fallback
      expect(getDefaultCategoryIcon("INVALID")).toBe("Tag");
    });
  });
});
