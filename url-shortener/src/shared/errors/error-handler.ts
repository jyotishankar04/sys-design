import type { ErrorRequestHandler } from "express";
import { AppError } from "./app-error";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message =
    error instanceof Error ? error.message : "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
  });
};
