import { Request, Response } from 'express';
import { getAuditLogByIdService, listAuditLogsService } from '../services/auditAction.service.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export const listAuditLogsController = async (req: Request, res: Response) => {
  logger.info(
    '[server][auditLogs][controller] listAuditLogs request received',
    { query: req.query },
  );

  const { page, limit, from, to, actorId, action, status, summary } = req.query;

  const pagination = {
    page: page ? parseInt(page as string) : undefined,
    page_size: limit ? parseInt(limit as string) : undefined,
  };

  const filters = {
    from: from as string | undefined,
    to: to as string | undefined,
    actorId: actorId as string | undefined,
    action: action as string | undefined,
    status: status as string | undefined,
    summary: summary as string | undefined,
  };

  const result = await listAuditLogsService(pagination, filters);

  return res.status(200).json(result);
};

export const getAuditLogByIdController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const id = req.params.id;

  logger.info(
    '[server][auditLogs][controller] getAuditLogById request received',
    { id },
  );

  if (!id) {
    throw new AppError(t('audit_log_id_required'), 400);
  }

  const result = await getAuditLogByIdService(id, t);

  return res.status(200).json(result);
};
