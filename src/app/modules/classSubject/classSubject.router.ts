// src/app/modules/classSubject/classSubject.router.ts
import express from "express";
import { auth } from "../auth/auth.middleware";
import { ClassSubjectController } from "./classSubject.controller";

const router = express.Router();

// Retrieve routes (accessible by student and admin)
router.get("/classes", auth(), ClassSubjectController.getAllClasses);
router.get("/subjects", auth(), ClassSubjectController.getSubjectsByClass);

// Onboarding route (student only)
router.patch("/complete-onboarding", auth("STUDENT", "ADMIN"), ClassSubjectController.completeOnboarding);

// Creation routes (admin only)
router.post("/classes", auth("ADMIN"), ClassSubjectController.createClass);
router.post("/subjects", auth("ADMIN"), ClassSubjectController.createSubject);
router.post("/topics", auth("ADMIN"), ClassSubjectController.createTopic);

export const ClassSubjectRoutes = router;
