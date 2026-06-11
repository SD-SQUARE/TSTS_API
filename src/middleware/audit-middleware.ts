import { Response, NextFunction } from "express";
import { MongoDataSource } from "../database/mongo-data-source.js";
import { AuditLog } from "../entities/mongo-entities/AuditLog.js";
import logger from "../utils/logger.js";

const AUDIT_SUCCESSFUL_READS = process.env.AUDIT_SUCCESSFUL_READS === "true";
const AUDIT_LOG_DETAILS = process.env.AUDIT_LOG_DETAILS === "true";
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const auditMiddleware = (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const excludedRoutes = [
    "/lockups",
    "/work-hours",
    "/chat",
    "/notifications",
    "/trusted-devices",
    "/permissions/profile",
  ];

  if (excludedRoutes.some((route) => req.path.startsWith(`/api/v1${route}`))) {
    return next();
  }

  const createdAt = new Date();

  req.audit = {
    steps: [],
  };

  next();

  res.on("finish", () => {
    setImmediate(async () => {
      try {
        const isSuccessfulRead =
          READ_METHODS.has(req.method) && res.statusCode < 400;
        if (isSuccessfulRead && !AUDIT_SUCCESSFUL_READS) {
          return;
        }

        if (!MongoDataSource.isInitialized) {
          logger.warn("MongoDataSource not ready, skipping audit log");
          return;
        }

        const repo = MongoDataSource.getMongoRepository(AuditLog);
        if (AUDIT_LOG_DETAILS) {
          logger.info(`Audit log: ${JSON.stringify(req.audit)}`);
        }
        await repo.insertOne({
          summary: req.audit?.summary,
          action: req.audit?.action,
          status: res.statusCode < 400 ? "SUCCESS" : "FAILED",
          actor: {
            id: req.user?.id,
            type: req.user?.role,
            ipAddress:
              req.ip.includes("::1") || req.ip === "::1" ? "localhost" : req.ip,
            userAgent: req.headers["user-agent"],
            full_name: req.user?.name,
          },
          resource: req.audit?.resource,
          metadata: req.audit?.metadata,
          steps: req.audit?.steps ?? [],
          createdAt,
          finishedAt: new Date(),
        });
      } catch (err) {
        logger.error("Audit log failed:", err);
      }
    });
  });
};
