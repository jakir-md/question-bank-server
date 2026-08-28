/**
 * @file taxonomy.utils.ts
 * @description Helper utility functions for Curriculum Taxonomy operations.
 */

/**
 * Generates a clean, URL-friendly slug from a string.
 *
 * @param text - The raw text to convert into a slug
 * @returns Clean slug string
 *
 * @example
 * ```ts
 * slugify("Physics 1st Paper") // "physics-1st-paper"
 * ```
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Calculates pagination skip and take values.
 *
 * @param page - Current page number (1-based)
 * @param limit - Number of items per page
 * @returns Object with skip and take values
 */
export function calculatePagination(
  page: number = 1,
  limit: number = 10,
): { skip: number; take: number; page: number; limit: number } {
  const parsedPage = Math.max(1, Number(page) || 1);
  const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  return {
    skip,
    take: parsedLimit,
    page: parsedPage,
    limit: parsedLimit,
  };
}
