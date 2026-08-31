// src/app/routes/index.ts
import express from "express";
import { AuthRoutes } from "../modules/auth/auth.router";


import { ClassSubjectRoutes } from "../modules/classSubject/classSubject.router";

export const router = express.Router();

const appRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/add-class-subjects",
    route: ClassSubjectRoutes,
  },
];

appRoutes.forEach((route) => router.use(route.path, route.route));