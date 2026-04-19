import { ObjectId } from 'mongodb';
import { MongoDataSource } from '../database/mongo-data-source.js';
import { AuditLog } from '../entities/mongo-entities/AuditLog.js';
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
  summary?: string;
}

const parseAuditLogDate = (value: string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  const nativeDate = new Date(normalized);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  const match = normalized.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)\s*\/\s*(\d{1,2})-(\d{1,2})-(\d{4})$/i,
  );

  if (!match) {
    return undefined;
  }

  const [, rawHours, rawMinutes, meridiem, rawDay, rawMonth, rawYear] = match;
  let hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  const day = Number(rawDay);
  const rawMonthNumber = Number(rawMonth);
  const year = Number(rawYear);

  if (
    [hours, minutes, day, rawMonthNumber, year].some((part) =>
      Number.isNaN(part),
    )
  ) {
    return undefined;
  }

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59 || day < 1) {
    return undefined;
  }

  if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }

  const month =
    rawMonthNumber >= 1 && rawMonthNumber <= 12 ? rawMonthNumber - 1 : rawMonthNumber;

  if (month < 0 || month > 11) {
    return undefined;
  }

  const parsedDate = new Date(year, month, day, hours, minutes, 0, 0);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return parsedDate;
};

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
    const fromDate = parseAuditLogDate(filters.from);
    const toDate = parseAuditLogDate(filters.to);

    query.createdAt = {};

    if (fromDate) {
      query.createdAt.$gte = fromDate;
    }

    if (toDate) {
      query.createdAt.$lte = toDate;
    }

    if (Object.keys(query.createdAt).length === 0) {
      delete query.createdAt;
    }
  }

  if (filters.actorId) {
    query['actor.id'] = ObjectId.isValid(filters.actorId)
      ? { $in: [filters.actorId, new ObjectId(filters.actorId)] }
      : filters.actorId;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.summary?.trim()) {
    query.summary = {
      $regex: filters.summary.trim(),
      $options: "i",
    };
  }

  const total = await auditRepository.count(query);

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
