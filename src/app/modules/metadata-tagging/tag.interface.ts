/**
 * @file tag.interface.ts
 * @description TypeScript interface definitions and DTOs for the Metadata & Tagging System.
 * Adheres to Essential TypeScript standards and TSDoc documentation.
 */

import { DifficultyLevel, QuestionType, TagCategory } from "@prisma/client";

/**
 * Data Transfer Object for creating a new Tag.
 */
export interface ICreateTagDTO {
  /** Display name of the tag (e.g. "Dhaka Board 2024", "Cadet College", "Hard") */
  name: string;
  /** Unique URL-friendly slug. If not provided, it is generated from name */
  slug?: string;
  /** Categorization domain */
  category?: TagCategory;
  /** Detailed description or usage guidance for the tag */
  description?: string;
  /** Hex color code for UI badge representation (e.g. "#3B82F6") */
  color?: string;
  /** Lucide icon identifier */
  icon?: string;
  /** Tag active status */
  isActive?: boolean;
}

/**
 * Data Transfer Object for updating an existing Tag.
 */
export interface IUpdateTagDTO {
  name?: string;
  slug?: string;
  category?: TagCategory;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  isActive?: boolean;
}

/**
 * Query filter options for retrieving paginated tags.
 */
export interface ITagFilterOptions {
  search?: string;
  category?: TagCategory;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "usageCount" | "category";
  sortOrder?: "asc" | "desc";
}

/**
 * Query options for high-speed tag autocomplete searches.
 */
export interface IAutocompleteTagOptions {
  /** Search query string */
  query: string;
  /** Optional category filter */
  category?: TagCategory;
  /** Maximum number of suggestions to return (default: 10, max: 50) */
  limit?: number;
  /** Only return active tags (default: true) */
  onlyActive?: boolean;
}

/**
 * DTO for bulk creating or resolving tags by names & categories.
 */
export interface IBulkCreateTagsDTO {
  tags: {
    name: string;
    category?: TagCategory;
    color?: string;
    description?: string;
  }[];
}

/**
 * Tag category summary metrics.
 */
export interface ITagCategorySummary {
  category: TagCategory;
  label: string;
  count: number;
  color: string;
  icon: string;
  description: string;
}

/**
 * High-level analytics and summary metrics for the tagging system.
 */
export interface ITagStatsResponse {
  totalTags: number;
  activeTags: number;
  inactiveTags: number;
  totalQuestionAttachments: number;
  categories: ITagCategorySummary[];
  topTags: {
    id: string;
    name: string;
    slug: string;
    category: TagCategory;
    color: string | null;
    usageCount: number;
  }[];
}

/**
 * DTO for attaching or synchronizing tags to a specific question.
 */
export interface IAttachTagsToQuestionDTO {
  /** Array of Tag IDs or Tag names to associate with the question */
  tagIds?: string[];
  /** Array of tag names for on-the-fly tag resolution/creation */
  tagNames?: string[];
  /** If true, replaces existing tags with the provided list. If false, appends new tags. (Default: true) */
  replaceExisting?: boolean;
}

/**
 * DTO for creating a sample/full Question with tags.
 */
export interface ICreateQuestionDTO {
  educationLevelId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  questionText: string;
  questionType?: QuestionType;
  options?: Array<{ id: string; text: string; isCorrect: boolean; explanation?: string }>;
  correctAnswer?: string;
  explanation?: string;
  difficulty?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  isActive?: boolean;
  isPublished?: boolean;
  tagIds?: string[];
  tagNames?: string[];
}

/**
 * DTO for querying and filtering questions by multiple tags and taxonomy hierarchy.
 */
export interface IQuestionFilterByTagsDTO {
  /** Array of tag IDs or slugs to filter by */
  tags?: string[];
  /** Logical operator: "AND" (question must have ALL tags) or "OR" (question has AT LEAST ONE tag). Default: "AND" */
  operator?: "AND" | "OR";
  /** Optional curriculum taxonomy filters */
  educationLevelId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: DifficultyLevel;
  questionType?: QuestionType;
  search?: string;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "difficulty" | "marks";
  sortOrder?: "asc" | "desc";
}
