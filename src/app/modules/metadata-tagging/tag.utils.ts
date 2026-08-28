/**
 * @file tag.utils.ts
 * @description Utility functions for slugification, default styling, and pagination.
 * Follows Essential TypeScript standards and TSDoc documentation.
 */

import { TagCategory } from "@prisma/client";

/**
 * Converts a string into a clean, URL-safe slug.
 * Handles English, numeric characters, Bengali transliteration accents, and hyphens.
 *
 * @param text - The raw input string
 * @returns Formatted URL-friendly slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

/**
 * Calculates pagination parameters for Prisma queries.
 *
 * @param page - Current 1-based page number
 * @param limit - Total items per page
 * @returns Sanitized page, limit, skip, and take values
 */
export function calculatePagination(
  page: number = 1,
  limit: number = 10,
): { page: number; limit: number; skip: number; take: number } {
  const sanitizedPage = Math.max(1, Number(page) || 1);
  const sanitizedLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (sanitizedPage - 1) * sanitizedLimit;

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
    skip,
    take: sanitizedLimit,
  };
}

/**
 * Category metadata mapping providing default colors, icons, and human-readable labels.
 */
export const TAG_CATEGORY_METADATA: Record<
  TagCategory,
  { label: string; color: string; icon: string; description: string }
> = {
  [TagCategory.BOARD_EXAM]: {
    label: "Board Exam",
    color: "#3B82F6", // Blue
    icon: "GraduationCap",
    description: "National education board examinations (e.g. Dhaka Board 2024, Rajshahi Board 2023)",
  },
  [TagCategory.CADET_COLLEGE]: {
    label: "Cadet College",
    color: "#8B5CF6", // Purple
    icon: "ShieldCheck",
    description: "Cadet college entrance and collegiate model tests (e.g. Faujdarhat, Mirzapur)",
  },
  [TagCategory.ADMISSION_TEST]: {
    label: "Admission Test",
    color: "#F59E0B", // Amber
    icon: "Target",
    description: "University & college competitive admissions (e.g. BUET, Medical, DU A-Unit, IBA)",
  },
  [TagCategory.INSTITUTION]: {
    label: "Institution / College",
    color: "#06B6D4", // Cyan
    icon: "Building2",
    description: "Premier colleges & high schools (e.g. Notre Dame College, Holy Cross, Viqarunnisa)",
  },
  [TagCategory.DIFFICULTY]: {
    label: "Difficulty Tier",
    color: "#EF4444", // Red / Coral
    icon: "Gauge",
    description: "Question complexity grade (e.g. Easy, Medium, Hard, Olympiad-level)",
  },
  [TagCategory.EXAM_YEAR]: {
    label: "Exam Year",
    color: "#10B981", // Emerald
    icon: "Calendar",
    description: "Academic examination cohort year (e.g. 2024, 2023, 2022)",
  },
  [TagCategory.TOPIC_SPECIAL]: {
    label: "Special Pattern",
    color: "#EC4899", // Pink
    icon: "Sparkles",
    description: "Pedagogical or structural pattern (e.g. Formula-based, Conceptual, Tricky)",
  },
  [TagCategory.CUSTOM]: {
    label: "Custom Tag",
    color: "#64748B", // Slate
    icon: "Tag",
    description: "General custom metadata tags created by content editors",
  },
};

/**
 * Returns default color for a given tag category if no custom color is specified.
 *
 * @param category - The TagCategory enum value
 * @returns Default hex color string
 */
export function getDefaultCategoryColor(category?: TagCategory): string {
  if (!category || !TAG_CATEGORY_METADATA[category]) {
    return TAG_CATEGORY_METADATA[TagCategory.CUSTOM].color;
  }
  return TAG_CATEGORY_METADATA[category].color;
}

/**
 * Returns default icon name for a given tag category.
 *
 * @param category - The TagCategory enum value
 * @returns Default Lucide icon key
 */
export function getDefaultCategoryIcon(category?: TagCategory): string {
  if (!category || !TAG_CATEGORY_METADATA[category]) {
    return TAG_CATEGORY_METADATA[TagCategory.CUSTOM].icon;
  }
  return TAG_CATEGORY_METADATA[category].icon;
}
