import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ToolNotFoundError, ToolDisabledError } from "../shared/errors";
import { logger } from "../shared";

/**
 * Centralized Express error-handling middleware.
 * Formats errors into clean JSON responses and prevents unhandled server crashes.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof ToolNotFoundError) {
    res.status(404).json({
      error: err.message,
      toolId: err.toolId,
    });
    return;
  }

  if (err instanceof ToolDisabledError) {
    res.status(400).json({
      error: err.message,
      toolId: err.toolId,
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error("Unhandled request error:", err);

  res.status(500).json({
    error: "Internal server error",
    message,
  });
}
