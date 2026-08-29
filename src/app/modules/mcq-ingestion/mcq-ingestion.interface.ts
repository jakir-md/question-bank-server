/**
 * @file mcq-ingestion.interface.ts
 * @description Type definitions and DTO contracts for MCQ Ingestion (Single & Multi-Context).
 * Complies with Essential TypeScript Coding Standards and TSDoc documentation.
 */

import { ContextType, DifficultyLevel, QuestionType } from "@prisma/client";

/**
 * Standard representation of an MCQ Option item.
 */
export interface IMCQOption {
  id: string; // "A" | "B" | "C" | "D" or custom key
  text: string; // Rich text / LaTeX option body
  isCorrect: boolean; // Exactly one option has isCorrect = true
}

/**
 * DTO for creating a Single Standalone MCQ Item.
 */
export interface ICreateSingleMCQDTO {
  questionText: string;
  questionType?: QuestionType;
  options: [IMCQOption, IMCQOption, IMCQOption, IMCQOption] | IMCQOption[];
  correctAnswer?: string;
  marks?: number;
  negativeMarks?: number;
  explanation?: string | null;
  difficulty?: DifficultyLevel;
  educationLevelId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  topicId?: string | null;
  tagIds?: string[];
  tagNames?: string[];
  contextId?: string | null;
  contextOrder?: number | null;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Sub-question definition for Multi-Context MCQ Ingestion.
 */
export interface ISubQuestionInput {
  questionText: string;
  questionType?: QuestionType;
  options: [IMCQOption, IMCQOption, IMCQOption, IMCQOption] | IMCQOption[];
  correctAnswer?: string;
  marks?: number;
  negativeMarks?: number;
  explanation?: string | null;
  difficulty?: DifficultyLevel;
  topicId?: string | null; // Granular topic override (optional)
  tagIds?: string[];
  tagNames?: string[];
  order?: number;
}

/**
 * DTO for creating a Multi-Context Question Package (Passage / Stem + Linked Sub-Questions).
 */
export interface ICreateMultiContextMCQDTO {
  context: {
    title?: string | null;
    contextText: string; // Rich text / LaTeX passage or scientific stem
    contextType?: ContextType;
    mediaUrl?: string | null;
    educationLevelId?: string | null;
    subjectId?: string | null;
    chapterId?: string | null;
    topicId?: string | null;
    isActive?: boolean;
    isPublished?: boolean;
  };
  questions: ISubQuestionInput[];
  commonTagIds?: string[];
  commonTagNames?: string[];
}

/**
 * DTO for updating an existing MCQ item.
 */
export interface IUpdateMCQDTO {
  questionText?: string;
  questionType?: QuestionType;
  options?: IMCQOption[];
  correctAnswer?: string;
  marks?: number;
  negativeMarks?: number;
  explanation?: string | null;
  difficulty?: DifficultyLevel;
  educationLevelId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  topicId?: string | null;
  contextId?: string | null;
  contextOrder?: number | null;
  tagIds?: string[];
  tagNames?: string[];
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * DTO for updating an existing Question Context (Passage/Stem).
 */
export interface IUpdateQuestionContextDTO {
  title?: string | null;
  contextText?: string;
  contextType?: ContextType;
  mediaUrl?: string | null;
  educationLevelId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  topicId?: string | null;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * Filter parameters for querying MCQ items.
 */
export interface IMCQFilterDTO {
  search?: string;
  educationLevelId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  contextId?: string;
  isMultiContext?: boolean; // If true, only MCQs with contextId != null; if false, standalone only
  difficulty?: DifficultyLevel;
  questionType?: QuestionType;
  tags?: string[];
  operator?: "AND" | "OR";
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "difficulty" | "marks";
  sortOrder?: "asc" | "desc";
}

/**
 * Filter parameters for querying Question Contexts.
 */
export interface IQuestionContextFilterDTO {
  search?: string;
  educationLevelId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  contextType?: ContextType;
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
}

/**
 * Aggregated statistics for MCQ Ingestion analytics.
 */
export interface IMCQStatsResponse {
  totalQuestions: number;
  totalSingleMCQs: number;
  totalMultiContextMCQs: number;
  totalContexts: number;
  difficultyDistribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
  totalActive: number;
  totalPublished: number;
}
