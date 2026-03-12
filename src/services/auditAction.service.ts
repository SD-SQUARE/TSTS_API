import { MongoDataSource } from "../database/mongo-data-source.js";
import { AuditLog } from "../entities/mongo-entities/AuditAction.js";
import logger from "../utils/logger.js";
import { buildPagination, PaginationQuery } from "../utils/pagination.js";

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
  filters: AuditLogFilters
) => {
  logger.info("[server][auditLogs][service] listAuditLogs request received", {
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
    query["actor.id"] = filters.actorId;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const total = await auditRepository.count({ where: query });

  const logs = await auditRepository.find({
    where: query,
    order: { createdAt: "DESC" },
    skip,
    take,
  });

  logger.info("[server][auditLogs][service] Audit logs fetched successfully", {
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