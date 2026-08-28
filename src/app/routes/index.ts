// src/app/routes/index.ts
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.router";
import { CurriculumTaxonomyRoutes } from "../modules/curriculum-taxonomy/taxonomy.router";
import { QuestionRoutes } from "../modules/metadata-tagging/question-tag.router";
import { TagRoutes } from "../modules/metadata-tagging/tag.router";

export const router = express.Router();

const appRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/curriculum-taxonomy",
    route: CurriculumTaxonomyRoutes,
  },
  {
    path: "/tags",
    route: TagRoutes,
  },
  {
    path: "/questions",
    route: QuestionRoutes,
  },
];

appRoutes.forEach((route) => router.use(route.path, route.route));