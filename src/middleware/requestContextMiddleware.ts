import { Request, Response, NextFunction } from "express";
import { runWithContext } from "../utils/requestContext.js";

/**
 * Middleware to populate AsyncLocalStorage context with userId and IP
 */
export const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const context = { ip };
  
  // Store in both places for maximum compatibility
  (req as any).context = context; // Fallback for multer and similar middleware
  runWithContext(context, next); // Primary method using AsyncLocalStorage
};