// src/app/auth/auth.utils.ts
import jwt from "jsonwebtoken";
import { EnvVars } from "../../config/env";

export const generateAccessToken = (userId: string, role: string) => {
  return jwt.sign({ userId, role }, EnvVars.JWT_ACCESS_TOKEN_SECRET as string, {
    expiresIn: "1h",
  });
};

export const generateRefreshToken = (userId: string, role: string) => {
  return jwt.sign(
    { userId, role },
    EnvVars.JWT_REFRESH_TOKEN_SECRET as string,
    { expiresIn: "7d" },
  );
};
