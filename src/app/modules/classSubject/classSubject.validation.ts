// src/app/modules/classSubject/classSubject.validation.ts
import { z } from "zod";

/**
 * Zod schema to validate adding a new academic class level.
 */
export const createClassSchema = z.object({
  name: z
    .string()
    .min(1, "Class name is required"),
});

/**
 * Zod schema to validate adding a new subject under a class.
 */
export const createSubjectSchema = z.object({
  name: z
    .string()
    .min(1, "Subject name is required"),
  classId: z
    .string()
    .uuid("Invalid Class ID format"),
});

/**
 * Zod schema to validate adding a new topic under a subject.
 */
export const createTopicSchema = z.object({
  name: z
    .string()
    .min(1, "Topic name is required"),
  subjectId: z
    .string()
    .uuid("Invalid Subject ID format"),
});

/**
 * Zod schema to validate student profile completion onboarding data.
 */
export const completeOnboardingSchema = z.object({
  name: z
    .string()
    .min(1, "Student name is required"),
  classId: z
    .string()
    .uuid("Invalid Class ID format"),
});
