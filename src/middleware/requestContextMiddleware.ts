import { Request, Response, NextFunction } from "express";
import { setRequestContext } from "../utils/requestContext.js";

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

  setRequestContext({ ip });

  next();
};
