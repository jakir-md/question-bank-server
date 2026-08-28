// src/app/routes/index.ts
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.router";
import { CurriculumTaxonomyRoutes } from "../modules/curriculum-taxonomy/taxonomy.router";


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
];

appRoutes.forEach((route) => router.use(route.path, route.route));