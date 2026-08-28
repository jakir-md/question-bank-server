import express from "express";
import {
  createUser,
  deleteUser,
  getAllUsers,
  getUserById,
  updateUser,
} from "./user.controller";
import { auth } from "../auth/auth.middleware";
import { Role } from "@prisma/client";

const router = express.Router();

router.post("/", auth(Role.ADMIN), createUser);
router.get("/", auth(Role.ADMIN), getAllUsers);
router.get("/:id", auth(Role.ADMIN), getUserById);
router.patch("/:id", auth(Role.ADMIN), updateUser);
router.delete("/:id", auth(Role.ADMIN), deleteUser);

export const UserRoutes = router;