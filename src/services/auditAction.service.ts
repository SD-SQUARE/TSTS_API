import { ObjectId } from 'mongodb';
import { MongoDataSource } from '../database/mongo-data-source.js';
import { AuditLog } from '../entities/mongo-entities/AuditAction.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { buildPagination, PaginationQuery } from '../utils/pagination.js';

const auditRepository = MongoDataSource.getMongoRepository(AuditLog);

interface AuditLogFilters {
  from?: string;
  to?: string;
  actorId?: string;
  action?: string;
  status?: string;
}

export const listAuditLogsService = async (
  pagination: PaginationQuery,
  filters: AuditLogFilters,
) => {
  logger.info('[server][auditLogs][service] listAuditLogs request received', {
    pagination,
    filters,
  });

  const { skip, take, meta } = buildPagination(pagination);

  const query: any = {};

  if (filters.from || filters.to) {
    query.createdAt = {};
    if (filters.from) query.createdAt.$gte = new Date(filters.from);
    if (filters.to) query.createdAt.$lte = new Date(filters.to);
  }

  if (filters.actorId) {
    query['actor.id'] = new ObjectId(filters.actorId);
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const total = await auditRepository.count(query);
  console.log('total', total);

  const logs = await auditRepository.find({
    where: query,
    order: { createdAt: 'DESC' },
    skip,
    take,
  });

  logger.info('[server][auditLogs][service] Audit logs fetched successfully', {
    total,
    returned: logs.length,
  });

  const mapped = logs.map((log) => ({
    id: log._id.toString(),
    summary: log.summary,
    actor: {
      id: log.actor?.id || null,
      full_name: log.actor?.full_name,
      type: log.actor?.type,
      ipAddress: log.actor?.ipAddress,
      userAgent: log.actor?.userAgent,
    },
    action: log.action,
    resource: log.resource
      ? {
          type: log.resource.type,
          id: log.resource.id,
        }
      : null,
    status: log.status,
    metadata: log.metadata || {},
    createdAt: log.createdAt,
  }));

  return {
    data: mapped,
    pagination: {
      page: meta.page_index,
      limit: meta.page_size,
      total,
    },
  };
};

export const getAuditLogByIdService = async (id: string, t: any) => {
  logger.info('[server][auditLogs][service] getAuditLogById request received', {
    id,
  });

  let objectId: ObjectId;

  try {
    objectId = new ObjectId(id);
  } catch {
    logger.info('[server][auditLogs][service] Invalid audit log id', { id });
    throw new AppError(t('audit_log_not_found'), 404);
  }

  const log = await auditRepository.findOne({
    where: { _id: objectId },
  });

  if (!log) {
    logger.info('[server][auditLogs][service] Audit log not found', { id });
    throw new AppError(t('audit_log_not_found'), 404);
  }

  logger.info('[server][auditLogs][service] Audit log fetched successfully', {
    id,
  });

  return {
    id: log._id.toString(),
    summary: log.summary,
    actor: {
      id: log.actor?.id || null,
      full_name: log.actor?.full_name,
      type: log.actor?.type,
      ipAddress: log.actor?.ipAddress,
      userAgent: log.actor?.userAgent,
    },
    action: log.action,
    resource: log.resource
      ? {
          type: log.resource.type,
          id: log.resource.id,
        }
      : null,
    status: log.status,
    metadata: log.metadata || {},
    createdAt: log.createdAt,
    steps:
      log.steps?.map((step) => ({
        time: step.time,
        action: step.action,
      })) || [],
  };
};
