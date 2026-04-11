import { Response, NextFunction } from "express";
import { MongoDataSource } from "../database/mongo-data-source.js";
import { AuditLog } from "../entities/mongo-entities/AuditLog.js";
import logger from "../utils/logger.js";

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

  res.on("finish", async () => {
    try {
      if (!MongoDataSource.isInitialized) {
        console.warn("MongoDataSource not ready, skipping audit log");
        return;
      }

      const repo = MongoDataSource.getMongoRepository(AuditLog);
      logger.info(`Audit log: ${JSON.stringify(req.audit)}`);
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
      console.error("Audit log failed:", err);
    }
  });
};
