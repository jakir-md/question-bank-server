// src/app/config/env.ts
import dotenv from "dotenv";
dotenv.config();

/**
 * Typed interface for required environment variables.
 */
interface EnvConfig {
  DATABASE_URL: string;
  PORT: string;
  NODE_ENV: string;
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ADMIN_PHONE: string;
  ADMIN_PASSWORD: string;
  BULKSMS_API_KEY?: string;
  BULKSMS_SENDER_ID?: string;
}

/**
 * Reads a required environment variable. Throws if missing.
 *
 * @param key - The environment variable key.
 * @returns The value of the environment variable.
 */
function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} env value not found`);
  return value;
}

/**
 * Reads an optional environment variable. Returns undefined if missing.
 *
 * @param key - The environment variable key.
 * @returns The value or undefined.
 */
function getOptionalEnv(key: string): string | undefined {
  return process.env[key];
}

const loadEnvVars = (): EnvConfig => ({
  DATABASE_URL: getEnv("DATABASE_URL"),
  PORT: getEnv("PORT"),
  NODE_ENV: getEnv("NODE_ENV"),
  ACCESS_TOKEN_SECRET: getEnv("ACCESS_TOKEN_SECRET"),
  REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET"),
  ADMIN_PHONE: getEnv("ADMIN_PHONE"),
  ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD"),
  BULKSMS_API_KEY: getOptionalEnv("BULKSMS_API_KEY"),
  BULKSMS_SENDER_ID: getOptionalEnv("BULKSMS_SENDER_ID"),
});

export const EnvVars = loadEnvVars();
