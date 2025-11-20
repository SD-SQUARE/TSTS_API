import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);
  logger.error(err);
  // Known app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: req.t ? req.t(err.message) : err.message,
    });
  }

  // CSRF error
  if (err.code === "EBADCSRFTOKEN") {
    return res
      .status(403)
      .json({ error: req.t ? req.t("forbidden") : "Forbidden" });
  }

  // Zod error (if someone uses Zod outside middleware)
  if (err?.issues) {
    const issues = err.issues.map((issue: any) => {
      const key = issue.message;
      return {
        path: issue.path,
        message: req.t ? req.t(key) : key,
      };
    });

    return res.status(400).json({ errors: issues });
  }

  // Fallback (unknown errors)
  return res.status(500).json({
    error: req.t ? req.t("internal_error") : "Internal Server Error",
  });
};
