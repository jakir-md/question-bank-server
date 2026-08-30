/**
 * @file cq-ingestion.interface.ts
 * @description Type definitions, cognitive domain enums, and DTO contracts for Creative Question (CQ) Ingestion.
 * Complies with Essential TypeScript Coding Standards and TSDoc documentation.
 */

import { ContextType, DifficultyLevel, QuestionType } from "@prisma/client";

/**
 * Standard cognitive domain levels for NCTB Creative Question sub-questions.
 */
export type CQSubQuestionKey =
  | "KNOWLEDGE" // ক (জ্ঞানমূলক) — Default 1 mark
  | "COMPREHENSION" // খ (অনুধাবনমূলক) — Default 2 marks
  | "APPLICATION" // গ (প্রয়োগমূলক) — Default 3 marks
  | "HIGHER_ABILITY"; // ঘ (উচ্চতর দক্ষতামূলক) — Default 4 marks

/**
 * Bengali sub-question order identifiers.
 */
export type CQSubQuestionLabel = "ক" | "খ" | "গ" | "ঘ";

/**
 * Interface representing a structured CQ Sub-Question definition.
 */
export interface ICQSubQuestionInput {
  label: CQSubQuestionLabel; // "ক" | "খ" | "গ" | "ঘ"
  cognitiveLevel: CQSubQuestionKey; // "KNOWLEDGE" | "COMPREHENSION" | "APPLICATION" | "HIGHER_ABILITY"
  questionText: string; // Sub-question text with LaTeX support
  marks: number; // 1, 2, 3, 4 by default
  explanation?: string | null; // Model answer / marking rubrics / solution guidelines
  difficulty?: DifficultyLevel; // EASY | MEDIUM | HARD
  topicId?: string | null; // Optional topic override
  tagIds?: string[];
  tagNames?: string[];
  order?: number; // 1, 2, 3, 4
}

/**
 * Context / Stimulus / Uddipok definition for CQ creation.
 */
export interface ICQStimulusInput {
  title?: string | null; // e.g. "দৃশ্যকল্প ১: তড়িৎ প্রবাহ ও বর্তনী"
  contextText: string; // Rich text / LaTeX Uddipok body
  contextType?: ContextType; // STEM | PASSAGE | SCENARIO | EXPERIMENT_DATA
  mediaUrl?: string | null; // Diagram / image attachment URL
  educationLevelId?: string | null;
  subjectId?: string | null;
  chapterId?: string | null;
  topicId?: string | null;
  isActive?: boolean;
  isPublished?: boolean;
}

/**
 * DTO for creating a complete CQ Package (Uddipok + exactly 4 sub-questions ক, খ, গ, ঘ).
 */
export interface ICreateCQDTO {
  stimulus: ICQStimulusInput;
  questions: [ICQSubQuestionInput, ICQSubQuestionInput, ICQSubQuestionInput, ICQSubQuestionInput] | ICQSubQuestionInput[];
  totalMarks?: number; // Default: 10.0
  commonTagIds?: string[];
  commonTagNames?: string[];
}

/**
 * DTO for updating an existing CQ Package.
 */
export interface IUpdateCQDTO {
  stimulus?: {
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
  };
  questions?: ICQSubQuestionInput[];
  totalMarks?: number;
  commonTagIds?: string[];
  commonTagNames?: string[];
}

/**
 * Filter parameters for querying Creative Questions.
 */
export interface ICQFilterDTO {
  search?: string;
  educationLevelId?: string;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  difficulty?: DifficultyLevel;
  tags?: string[];
  operator?: "AND" | "OR";
  isActive?: boolean;
  isPublished?: boolean;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
}

/**
 * Aggregated statistics for CQ Ingestion analytics.
 */
export interface ICQStatsResponse {
  totalCQSets: number;
  totalSubQuestions: number;
  cognitiveDistribution: {
    KNOWLEDGE: number;
    COMPREHENSION: number;
    APPLICATION: number;
    HIGHER_ABILITY: number;
  };
  difficultyDistribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
  };
  totalMarksLogged: number;
  totalActive: number;
  totalPublished: number;
}
