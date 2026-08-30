/**
 * @file taxonomy.utils.test.ts
 * @description Unit tests for Curriculum Taxonomy utility functions (slugify & calculatePagination).
 */

import { describe, expect, it } from "vitest";
import { calculatePagination, slugify } from "../taxonomy.utils";

describe("Curriculum Taxonomy Utilities", () => {
  describe("slugify", () => {
    it("should convert a basic string into a lowercase kebab-case slug", () => {
      expect(slugify("Higher Secondary Certificate")).toBe("higher-secondary-certificate");
    });

    it("should handle strings with multiple spaces and special characters", () => {
      expect(slugify("Physics - 1st Paper (HSC & Admission)!")).toBe("physics-1st-paper-hsc-admission");
    });

    it("should trim leading and trailing hyphens/spaces", () => {
      expect(slugify("  --Chapter 01: Vector Analysis--  ")).toBe("chapter-01-vector-analysis");
    });

    it("should handle Bengali and Unicode characters gracefully", () => {
      const result = slugify("বাংলা ১ম পত্র");
      expect(typeof result).toBe("string");
    });

    it("should handle numeric and alphanumeric strings", () => {
      expect(slugify("Class 12 - Chapter 5")).toBe("class-12-chapter-5");
    });
  });

  describe("calculatePagination", () => {
    it("should return default pagination when no parameters are provided", () => {
      const result = calculatePagination();
      expect(result).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
        take: 10,
      });
    });

    it("should calculate correct skip and take for page 3 with limit 20", () => {
      const result = calculatePagination(3, 20);
      expect(result).toEqual({
        page: 3,
        limit: 20,
        skip: 40,
        take: 20,
      });
    });

    it("should sanitize invalid/negative page and limit inputs", () => {
      const result = calculatePagination(-5, -10);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(1);
    });

    it("should enforce a maximum limit cap of 100", () => {
      const result = calculatePagination(1, 500);
      expect(result.limit).toBe(100);
      expect(result.take).toBe(100);
    });

    it("should handle string-coerced inputs safely", () => {
      // @ts-expect-error Testing runtime resilience
      const result = calculatePagination("2", "15");
      expect(result).toEqual({
        page: 2,
        limit: 15,
        skip: 15,
        take: 15,
      });
    });
  });
});
