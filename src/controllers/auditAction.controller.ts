import { Request, Response } from "express";
import { listAuditLogsService } from "../services/auditAction.service.js";
import logger from "../utils/logger.js";

export const listAuditLogsController = async (req: Request, res: Response) => {
  logger.info(
    "[server][auditLogs][controller] listAuditLogs request received",
    { query: req.query }
  );

  const { page, limit, from, to, actorId, action, status } = req.query;

  const pagination = {
    page: page ? parseInt(page as string) : undefined,
    limit: limit ? parseInt(limit as string) : undefined,
  };

  const filters = {
    from: from as string | undefined,
    to: to as string | undefined,
    actorId: actorId as string | undefined,
    action: action as string | undefined,
    status: status as string | undefined,
  };

  const result = await listAuditLogsService(pagination, filters);

  return res.status(200).json(result);
};