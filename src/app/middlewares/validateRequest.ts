/**
 * @file validateRequest.ts
 * @description Express middleware to validate request payload against Zod schema.
 */

import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import ApiError from "../error/ApiError";

/**
 * Higher-order middleware function to validate incoming request body, query, and params against a Zod schema.
 *
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export const validateRequest =
  (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", ");
        next(new ApiError(400, `Validation Error: ${errorMessages}`));
      } else {
        next(error);
      }
    }
  };

export default validateRequest;
