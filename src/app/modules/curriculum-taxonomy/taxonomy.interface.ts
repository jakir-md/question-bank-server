/**
 * @file taxonomy.interface.ts
 * @description Domain interfaces and DTO definitions for Curriculum Taxonomy Management.
 * Follows Essential TypeScript Coding Standards and TSDoc conventions.
 */

import { ImportanceLevel, DifficultyLevel } from "@prisma/client";

/**
 * Interface representing an Education Level entity in the system.
 */
export interface IEducationLevel {
  id: string;
  name: string;
  code: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload interface for creating an Education Level.
 */
export interface ICreateEducationLevelDTO {
  name: string;
  code: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Payload interface for updating an Education Level.
 */
export interface IUpdateEducationLevelDTO {
  name?: string;
  code?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Filter parameters for querying Education Levels.
 */
export interface IEducationLevelFilterOptions {
  search?: string;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Interface representing a Subject entity in the system.
 */
export interface ISubject {
  id: string;
  educationLevelId: string;
  name: string;
  code: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  paper?: string | null;
  subjectCode?: string | null;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload interface for creating a Subject.
 */
export interface ICreateSubjectDTO {
  educationLevelId: string;
  name: string;
  code: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  paper?: string;
  subjectCode?: string;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Payload interface for updating a Subject.
 */
export interface IUpdateSubjectDTO {
  educationLevelId?: string;
  name?: string;
  code?: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  paper?: string;
  subjectCode?: string;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Filter parameters for querying Subjects.
 */
export interface ISubjectFilterOptions {
  search?: string;
  educationLevelId?: string;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Interface representing a Chapter entity in the system.
 */
export interface IChapter {
  id: string;
  subjectId: string;
  chapterNumber?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  totalEstimatedHours?: number | null;
  weightage?: number | null;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload interface for creating a Chapter.
 */
export interface ICreateChapterDTO {
  subjectId: string;
  chapterNumber?: number;
  name: string;
  slug?: string;
  description?: string;
  totalEstimatedHours?: number;
  weightage?: number;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Payload interface for updating a Chapter.
 */
export interface IUpdateChapterDTO {
  subjectId?: string;
  chapterNumber?: number;
  name?: string;
  slug?: string;
  description?: string;
  totalEstimatedHours?: number;
  weightage?: number;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Filter parameters for querying Chapters.
 */
export interface IChapterFilterOptions {
  search?: string;
  subjectId?: string;
  educationLevelId?: string;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Interface representing a Topic entity in the system.
 */
export interface ITopic {
  id: string;
  chapterId: string;
  parentTopicId?: string | null;
  topicNumber?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  learningObjectives: string[];
  importanceLevel: ImportanceLevel;
  difficultyLevel: DifficultyLevel;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payload interface for creating a Topic.
 */
export interface ICreateTopicDTO {
  chapterId: string;
  parentTopicId?: string | null;
  topicNumber?: string;
  name: string;
  slug?: string;
  description?: string;
  learningObjectives?: string[];
  importanceLevel?: ImportanceLevel;
  difficultyLevel?: DifficultyLevel;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Payload interface for updating a Topic.
 */
export interface IUpdateTopicDTO {
  chapterId?: string;
  parentTopicId?: string | null;
  topicNumber?: string;
  name?: string;
  slug?: string;
  description?: string;
  learningObjectives?: string[];
  importanceLevel?: ImportanceLevel;
  difficultyLevel?: DifficultyLevel;
  orderIndex?: number;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Filter parameters for querying Topics.
 */
export interface ITopicFilterOptions {
  search?: string;
  chapterId?: string;
  subjectId?: string;
  educationLevelId?: string;
  parentTopicId?: string | null;
  importanceLevel?: ImportanceLevel;
  difficultyLevel?: DifficultyLevel;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Payload interface for bulk reordering taxonomy items.
 */
export interface IReorderTaxonomyItemDTO {
  id: string;
  orderIndex: number;
}

/**
 * Payload interface for reordering list.
 */
export interface IReorderTaxonomyDTO {
  items: IReorderTaxonomyItemDTO[];
}

/**
 * Full hierarchical nested tree node for topics.
 */
export interface ITaxonomyTopicNode {
  id: string;
  topicNumber?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  learningObjectives: string[];
  importanceLevel: ImportanceLevel;
  difficultyLevel: DifficultyLevel;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  subTopics?: ITaxonomyTopicNode[];
}

/**
 * Full hierarchical nested tree node for chapters.
 */
export interface ITaxonomyChapterNode {
  id: string;
  chapterNumber?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  totalEstimatedHours?: number | null;
  weightage?: number | null;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  topicCount: number;
  topics: ITaxonomyTopicNode[];
}

/**
 * Full hierarchical nested tree node for subjects.
 */
export interface ITaxonomySubjectNode {
  id: string;
  name: string;
  code: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  paper?: string | null;
  subjectCode?: string | null;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  chapterCount: number;
  topicCount: number;
  chapters: ITaxonomyChapterNode[];
}

/**
 * Full hierarchical nested tree node for education levels.
 */
export interface ITaxonomyLevelNode {
  id: string;
  name: string;
  code: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex: number;
  isActive: boolean;
  isPublished: boolean;
  subjectCount: number;
  chapterCount: number;
  topicCount: number;
  subjects: ITaxonomySubjectNode[];
}

/**
 * Full taxonomy tree response representation.
 */
export interface ITaxonomyTreeResponse {
  tree: ITaxonomyLevelNode[];
  meta: {
    totalLevels: number;
    totalSubjects: number;
    totalChapters: number;
    totalTopics: number;
  };
}

/**
 * Topic lineage / breadcrumb path resolution.
 */
export interface ITopicLineage {
  level: { id: string; name: string; code: string; slug: string };
  subject: { id: string; name: string; code: string; slug: string };
  chapter: { id: string; name: string; chapterNumber?: number | null; slug: string };
  topic: { id: string; name: string; topicNumber?: string | null; slug: string };
  parentTopic?: { id: string; name: string; slug: string } | null;
}

/**
 * Aggregated statistics of the Curriculum Taxonomy.
 */
export interface ITaxonomyStats {
  totalLevels: number;
  activeLevels: number;
  totalSubjects: number;
  activeSubjects: number;
  totalChapters: number;
  activeChapters: number;
  totalTopics: number;
  activeTopics: number;
  publishedTopics: number;
  importanceBreakdown: Record<string, number>;
  difficultyBreakdown: Record<string, number>;
}
