// src/app/modules/classSubject/classSubject.service.ts
import { AcademicClass, Subject, Topic, User } from "@prisma/client";
import { prisma } from "../../../shared/prisma";
import ApiError from "../../error/ApiError";

// =========================================================================
// CLASSES SERVICES
// =========================================================================

/**
 * Fetches all academic classes.
 *
 * @returns Array of academic classes.
 */
export const getAllClassesService = async (): Promise<AcademicClass[]> => {
  try {
    return await prisma.academicClass.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to retrieve classes: " + msg);
  }
};

/**
 * Creates a new academic class level.
 *
 * @param name - Unique class level name.
 * @returns The created academic class.
 */
export const createClassService = async (name: string): Promise<AcademicClass> => {
  try {
    const existing = await prisma.academicClass.findUnique({
      where: { name },
    });

    if (existing) {
      throw new ApiError(400, "Class name already exists.");
    }

    return await prisma.academicClass.create({
      data: { name },
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to create class: " + msg);
  }
};

// =========================================================================
// SUBJECTS SERVICES
// =========================================================================

/**
 * Fetches all subjects registered under a specific class level.
 *
 * @param classId - UUID of the academic class.
 * @returns Array of subjects.
 */
export const getSubjectsByClassService = async (classId: string): Promise<Subject[]> => {
  try {
    return await prisma.subject.findMany({
      where: { classId },
      orderBy: { name: "asc" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to retrieve subjects: " + msg);
  }
};

/**
 * Creates a new subject for a class level.
 *
 * @param name    - Subject name.
 * @param classId - Target academic class level.
 * @returns The created subject.
 */
export const createSubjectService = async (
  name: string,
  classId: string,
): Promise<Subject> => {
  try {
    // Verify class exists
    const classExists = await prisma.academicClass.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      throw new ApiError(404, "Target academic class not found.");
    }

    // Verify uniqueness of subject under this class
    const existing = await prisma.subject.findUnique({
      where: {
        name_classId: { name, classId },
      },
    });

    if (existing) {
      throw new ApiError(400, "Subject name already exists for this class.");
    }

    return await prisma.subject.create({
      data: { name, classId },
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to create subject: " + msg);
  }
};

// =========================================================================
// TOPICS SERVICES
// =========================================================================

/**
 * Creates a new topic under a subject.
 *
 * @param name      - Topic name.
 * @param subjectId - Target subject ID.
 * @returns The created topic.
 */
export const createTopicService = async (
  name: string,
  subjectId: string,
): Promise<Topic> => {
  try {
    // Verify subject exists
    const subjectExists = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subjectExists) {
      throw new ApiError(404, "Target subject not found.");
    }

    // Verify uniqueness of topic under this subject
    const existing = await prisma.topic.findUnique({
      where: {
        name_subjectId: { name, subjectId },
      },
    });

    if (existing) {
      throw new ApiError(400, "Topic name already exists for this subject.");
    }

    return await prisma.topic.create({
      data: { name, subjectId },
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to create topic: " + msg);
  }
};

// =========================================================================
// STUDENT ONBOARDING SERVICE
// =========================================================================

/**
 * Completes a student's profile setup by mapping their name and class.
 *
 * @param userId  - Student's UUID.
 * @param name    - Student's full name.
 * @param classId - Selected academic class level.
 * @returns The updated student user model.
 */
export const completeOnboardingService = async (
  userId: string,
  name: string,
  classId: string,
): Promise<User> => {
  try {
    // Verify class level exists
    const classExists = await prisma.academicClass.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      throw new ApiError(404, "Selected class level not found.");
    }

    return await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        classId,
        isOnboarded: true,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    const msg = error instanceof Error ? error.message : "Unknown error";
    throw new ApiError(500, "Failed to complete onboarding: " + msg);
  }
};

// =========================================================================
// SERVICE OBJECT
// =========================================================================

export const ClassSubjectServices = {
  getAllClassesService,
  createClassService,
  getSubjectsByClassService,
  createSubjectService,
  createTopicService,
  completeOnboardingService,
};
