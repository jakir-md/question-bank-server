// src/app/modules/classSubject/classSubject.controller.ts
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import ApiError from "../../error/ApiError";
import {
  completeOnboardingSchema,
  createClassSchema,
  createSubjectSchema,
  createTopicSchema,
} from "./classSubject.validation";
import { ClassSubjectServices } from "./classSubject.service";

// =========================================================================
// FETCH CONTROLLERS
// =========================================================================

/**
 * GET /class-subject/classes
 * Retrieves all registered class levels.
 */
export const getAllClasses = catchAsync(async (_req: Request, res: Response): Promise<void> => {
  const result = await ClassSubjectServices.getAllClassesService();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Classes fetched successfully",
    data: result,
  });
});

/**
 * GET /class-subject/subjects
 * Retrieves subjects filtered by class level (classId passed as query parameter).
 */
export const getSubjectsByClass = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const classId = req.query.classId as string | undefined;

  if (!classId) {
    throw new ApiError(400, "Class ID query parameter is required.");
  }

  const result = await ClassSubjectServices.getSubjectsByClassService(classId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subjects fetched successfully",
    data: result,
  });
});

// =========================================================================
// STUDENT ONBOARDING CONTROLLER
// =========================================================================

/**
 * PATCH /class-subject/complete-onboarding
 * Completes a student's profile settings by saving their name and class level.
 */
export const completeOnboarding = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const user = req.user;

  if (!user) {
    throw new ApiError(401, "Unauthorized access.");
  }

  const parsed = completeOnboardingSchema.safeParse(req.body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid onboarding payload";
    throw new ApiError(400, msg);
  }

  const result = await ClassSubjectServices.completeOnboardingService(
    user.userId,
    parsed.data.name,
    parsed.data.classId,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile onboarding completed successfully.",
    data: {
      id: result.id,
      name: result.name,
      phone: result.phone,
      isOnboarded: result.isOnboarded,
      classId: result.classId,
    },
  });
});

// =========================================================================
// ADMIN ACTION CONTROLLERS
// =========================================================================

/**
 * POST /class-subject/classes
 * Creates a new class level.
 */
export const createClass = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = createClassSchema.safeParse(req.body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid class data";
    throw new ApiError(400, msg);
  }

  const result = await ClassSubjectServices.createClassService(parsed.data.name);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Class created successfully.",
    data: result,
  });
});

/**
 * POST /class-subject/subjects
 * Creates a new subject for a class level.
 */
export const createSubject = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = createSubjectSchema.safeParse(req.body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid subject data";
    throw new ApiError(400, msg);
  }

  const result = await ClassSubjectServices.createSubjectService(
    parsed.data.name,
    parsed.data.classId,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Subject created successfully.",
    data: result,
  });
});

/**
 * POST /class-subject/topics
 * Creates a new topic under a subject.
 */
export const createTopic = catchAsync(async (req: Request, res: Response): Promise<void> => {
  const parsed = createTopicSchema.safeParse(req.body);

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid topic data";
    throw new ApiError(400, msg);
  }

  const result = await ClassSubjectServices.createTopicService(
    parsed.data.name,
    parsed.data.subjectId,
  );

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Topic created successfully.",
    data: result,
  });
});

// =========================================================================
// CONTROLLER OBJECT EXPORT
// =========================================================================

export const ClassSubjectController = {
  getAllClasses,
  getSubjectsByClass,
  completeOnboarding,
  createClass,
  createSubject,
  createTopic,
};
