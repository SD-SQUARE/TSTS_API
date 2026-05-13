import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { Ticket } from "../../../entities/index.js";
import { AuditAction } from "../../../enums/AuditAction.enum.js";
import { TicketActivityType } from "../../../enums/TicketActivity.enum.js";
import { TicketStatus } from "../../../enums/TicketStatus.enum.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { audit } from "../../../helpers/auditBuilder.js";
import { formatTicketStatus } from "../../../helpers/ticketsHelper.js";
import { Lang } from "../../../types/lang.types.js";
import { ReqUserPayload } from "../../../types/ReqUserPayload.js";
import { AppError } from "../../../utils/AppError.js";
import { buildLocalizedName } from "../../../utils/localizeName.js";
import logger from "../../../utils/logger.js";
import { buildPagination } from "../../../utils/pagination.js";
import { redisKeys } from "../../../utils/redisKeys.js";
import { GetTicketsQuery } from "../../../validation/ticket.schema.js";
import { logTicketActivity } from "../../tickets.service.js";
import { Request } from "express";
import { getManagedGroupSpecializationIds } from "../../groups/group-access.service.js";
import {
  getActiveSlaRuleSnapshots,
  getTicketSlaState,
  getTicketSlaStateFromRules,
} from "../../sla.service.js";
import {
  readJsonCache,
  TICKET_ANALYTICS_TTL_SECONDS,
  writeJsonCache,
} from "../ticket-cache.service.js";

const ticketRepo = PostgresDataSource.getRepository(Ticket);

const buildTicketListQuery = () =>
  ticketRepo
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("requester.university", "requesterUniversity")
    .leftJoinAndSelect("requester.domain", "requesterDomain")
    .leftJoinAndSelect("requester.userDepartments", "requesterDepartmentLink")
    .leftJoinAndSelect("requesterDepartmentLink.department", "requesterDepartment")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("ticket.problem", "problem")
    .leftJoinAndSelect("ticket.assigneeList", "assignee")
    .distinct(true);

const applyTicketAccessFilters = async (
  qb: ReturnType<typeof buildTicketListQuery>,
  user: ReqUserPayload,
) => {
  const managedSpecializationIds = await getManagedGroupSpecializationIds(user.id);
  const hasManagedSpecializations = managedSpecializationIds.length > 0;

  if (user.role === UserType.REQUESTER) {
    qb.andWhere("requester.id = :userId", {
      userId: user.id,
    });

    logger.info("[tickets] requester access applied", { userId: user.id });
  }

  if (user.role === UserType.TECHNICIAN) {
    if (hasManagedSpecializations) {
      qb.andWhere(
        "(assignee.id = :userId OR specialization.id IN (:...managedSpecializationIds))",
        {
          userId: user.id,
          managedSpecializationIds,
        },
      );
    } else {
      qb.andWhere("assignee.id = :userId", {
        userId: user.id,
      });
    }

    logger.info("[tickets] technician access applied", { userId: user.id });
  }

  if (user.role === UserType.ADMIN && hasManagedSpecializations) {
    qb.andWhere("specialization.id IN (:...managedSpecializationIds)", {
      managedSpecializationIds,
    });
  }

  if (user.role === UserType.SUPER_ADMIN) {
    logger.info("[tickets] super admin access applied", { userId: user.id });
  }
};

const statusCount = (tickets: Ticket[], statuses: string[]) =>
  tickets.filter((ticket) => statuses.includes(ticket.status)).length;

const terminalStatuses = new Set<TicketStatus>([
  TicketStatus.CLOSED,
  TicketStatus.RESOLVED,
]);

const getTicketTiming = (ticket: Ticket) => {
  const closedAt = terminalStatuses.has(ticket.status) ? ticket.modifiedAt : null;
  const totalTimeUntilClosedSeconds =
    closedAt && ticket.createdAt
      ? Math.max(
          0,
          Math.floor((closedAt.getTime() - ticket.createdAt.getTime()) / 1000),
        )
      : null;

  return {
    closedAt,
    totalTimeUntilClosedSeconds,
  };
};

export const getAllTicketsService = async (
  query: GetTicketsQuery,
  lang: Lang,
  user: ReqUserPayload,
  req?: Request,
) => {
  logger.info("[server][tickets] getAllTickets | start", {
    lang,
    query,
  });
  const auditLog = audit(req)
    .summary("Get All Tickets")
    .action(AuditAction.GET_TICKETS)
    .metadata({ userId: user.id });

  auditLog.step("Resolve pagination");

  const { skip, take, meta } = buildPagination({
    page: query.page_index,
    page_size: query.page_size,
  });

  logger.info("[server][tickets] getAllTickets | pagination resolved", {
    skip,
    take,
    pageIndex: meta.page_index,
    pageSize: meta.page_size,
  });

  const qb = buildTicketListQuery();

  auditLog.step("Applying role-based filters");
  await applyTicketAccessFilters(qb, user);

  logger.info("[server][tickets] getAllTickets | base query initialized");
  auditLog.step("Applying query filters");
  if (query.id) {
    qb.andWhere("ticket.id = :ticketId", {
      ticketId: query.id,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "id",
      value: query.id,
    });
  }

  if (query.ticket_number) {
    qb.andWhere("ticket.ticket_number = :ticketNumber", {
      ticketNumber: query.ticket_number,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "ticket_number",
      value: query.ticket_number,
    });
  }

  if (query.title) {
    qb.andWhere("ticket.title ILIKE :title", {
      title: `%${query.title}%`,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "title",
      value: query.title,
    });
  }

  if (query.specialization) {
    const values = Array.isArray(query.specialization)
      ? query.specialization
      : [query.specialization];
    qb.andWhere("specialization.id IN (:...specializations)", {
      specializations: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "specialization",
      specializationIds: values,
    });
  }

  if (query.problem) {
    const values = Array.isArray(query.problem)
      ? query.problem
      : [query.problem];
    qb.andWhere("problem.id IN (:...problems)", {
      problems: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "problem",
      problemIds: values,
    });
  }

  if (query.status) {
    const values = Array.isArray(query.status) ? query.status : [query.status];
    qb.andWhere("ticket.status IN (:...statuses)", {
      statuses: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "status",
      statuses: values,
    });
  }

  if (query.priority) {
    const values = Array.isArray(query.priority)
      ? query.priority
      : [query.priority];
    qb.andWhere("ticket.priority IN (:...priorities)", {
      priorities: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "priority",
      priorities: values,
    });
  }

  if (query.requester) {
    const values = Array.isArray(query.requester)
      ? query.requester
      : [query.requester];
    qb.andWhere("requester.id IN (:...requesterIds)", {
      requesterIds: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "requester",
      requesterIds: values,
    });
  }

  if (query.assignee) {
    const values = Array.isArray(query.assignee)
      ? query.assignee
      : [query.assignee];
    qb.andWhere("assignee.id IN (:...assigneeIds)", {
      assigneeIds: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "assignee",
      assigneeIds: values,
    });
  }

  if (query.university) {
    const values = Array.isArray(query.university)
      ? query.university
      : [query.university];
    qb.andWhere("requesterUniversity.id IN (:...universityIds)", {
      universityIds: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "university",
      universityIds: values,
    });
  }

  if (query.domain) {
    const values = Array.isArray(query.domain)
      ? query.domain
      : [query.domain];
    qb.andWhere("requesterDomain.id IN (:...domainIds)", {
      domainIds: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "domain",
      domainIds: values,
    });
  }

  if (query.department) {
    const values = Array.isArray(query.department)
      ? query.department
      : [query.department];
    qb.andWhere("requesterDepartment.id IN (:...departmentIds)", {
      departmentIds: values,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "department",
      departmentIds: values,
    });
  }

  qb.skip(skip).take(take).orderBy("ticket.createdAt", "DESC");

  logger.info("[server][tickets] getAllTickets | query ready", {
    skip,
    take,
    orderBy: "ticket.createdAt DESC",
  });

  logger.info("[server][tickets] getAllTickets | executing query");

  auditLog.step("Executing query");
  const [tickets, total] = await qb.getManyAndCount();

  logger.info("[server][tickets] getAllTickets | query executed", {
    returnedCount: tickets.length,
    totalCount: total,
  });

  logger.info("[server][tickets] getAllTickets | mapping tickets", {
    ticketsCount: tickets.length,
    lang,
  });



  auditLog
    .step("Mapping tickets to DTO")
    .metadata({ returnedCount: tickets.length });

  const slaRules = await getActiveSlaRuleSnapshots();

  const mappedTickets = await Promise.all(tickets.map(async (ticket) => {
    let university = null;
    let domain = null;
    let userDepartments: any[] = [];

    let resolvedDepartments: any[] = [];

    if (ticket.requester) {
      university = await ticket.requester.university;
      domain = await ticket.requester.domain;
      userDepartments = await ticket.requester.userDepartments;

      if (Array.isArray(userDepartments)) {
        resolvedDepartments = await Promise.all(
          userDepartments.map(async (link: any) => await link.department)
        );
      }
    }

    const sla = await getTicketSlaStateFromRules(ticket, lang, slaRules);
    const timing = getTicketTiming(ticket);

    return {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      title: ticket.title,
      description: ticket.description,
      createdAt: ticket.createdAt,
      modifiedAt: ticket.modifiedAt,
      ...timing,

      requester: ticket.requester
        ? {
            id: ticket.requester.id,
            name: buildLocalizedName(ticket.requester, lang),
            image: ticket.requester.image,
            university: university
              ? {
                  id: university.id,
                  name: university.name?.[lang] || "",
                }
              : null,
            domain: domain
              ? {
                  id: domain.id,
                  name: domain.name?.[lang] || "",
                }
              : null,
            departments: resolvedDepartments
              .filter((dept: any) => dept && dept.id)
              .map((dept: any) => ({
                id: dept.id,
                name: dept.name?.[lang] || "",
              })),
          }
        : null,

      specialization: ticket.specialization
        ? {
            id: ticket.specialization.id,
            name: ticket.specialization.name?.[lang],
          }
        : null,

      problem: ticket.problem
        ? {
            id: ticket.problem.id,
            name: ticket.problem.name?.[lang],
          }
        : null,

      status: formatTicketStatus(ticket.status),
      priority: ticket.priority,
      isOutOfService: ticket.isOutOfService,

      assignee:
        ticket.assigneeList?.map((user) => ({
          id: user.id,
          name: buildLocalizedName(user, lang),
          image: user.image,
        })) || [],
      sla,
    };
  }));

  logger.info("[server][tickets] getAllTickets | completed", {
    returnedCount: mappedTickets.length,
    total,
    pageIndex: meta.page_index,
    pageSize: meta.page_size,
  });

  auditLog
    .step("Completed")
    .metadata({ total, pageIndex: meta.page_index, pageSize: meta.page_size });

  return {
    tickets: mappedTickets,
    meta: {
      total,
      page_index: meta.page_index,
      page_size: meta.page_size,
    },
  };
};

export const getTicketAnalyticsService = async (
  lang: Lang,
  user: ReqUserPayload,
) => {
  const cacheKey = redisKeys.ticketAnalytics(user.role || "unknown", user.id, lang);
  const cached = await readJsonCache(cacheKey);
  if (cached) {
    return cached;
  }

  const qb = buildTicketListQuery();
  await applyTicketAccessFilters(qb, user);

  const tickets = await qb.getMany();
  const slaRules = await getActiveSlaRuleSnapshots();
  const slaStates = await Promise.all(
    tickets.map((ticket) => getTicketSlaStateFromRules(ticket, lang, slaRules)),
  );
  const slaViolated = slaStates.filter((state) => state.violated).length;
  const total = tickets.length;

  const base = {
    total,
    open: statusCount(tickets, [TicketStatus.OPEN, TicketStatus.REOPEN]),
    inProgress: statusCount(tickets, [
      TicketStatus.IN_PROGRESS,
      TicketStatus.PENDING,
    ]),
    resolved: statusCount(tickets, [
      TicketStatus.RESOLVED,
      TicketStatus.CLOSED,
    ]),
    unassigned: tickets.filter((ticket) => !ticket.assigneeList?.length).length,
    slaViolated,
  };

  const analytics =
    user.role === UserType.REQUESTER
      ? {
          total: base.total,
          open: base.open,
          resolved: base.resolved,
        }
      : user.role === UserType.TECHNICIAN
        ? {
            total: base.total,
            assigned: base.total,
            open: base.open,
            inProgress: base.inProgress,
            slaViolated: base.slaViolated,
          }
        : {
            total: base.total,
            unassigned: base.unassigned,
            inProgress: base.inProgress,
            slaViolated: base.slaViolated,
          };

  await writeJsonCache(cacheKey, analytics, TICKET_ANALYTICS_TTL_SECONDS);

  return analytics;
};

export const getSingleTicketService = async (
  ticketId: string | undefined,
  ticketNumber: number | undefined,
  lang: Lang,
  user: ReqUserPayload,
  userName: string,
  req?: Request,
) => {
  const auditLog = audit(req);
  logger.info("[server][tickets] getSingleTicket | start", {
    ticketId,
    ticketNumber,
    lang,
  });

  auditLog.step("Querying ticket from database");

  const qb = ticketRepo
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("requester.university", "requesterUniversity")
    .leftJoinAndSelect("requester.domain", "requesterDomain")
    .leftJoinAndSelect("requester.userDepartments", "requesterDepartmentLink")
    .leftJoinAndSelect("requesterDepartmentLink.department", "requesterDepartment")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("ticket.problem", "problem")
    .leftJoinAndSelect("ticket.assigneeList", "assignee");

  if (ticketId) {
    qb.andWhere("ticket.id = :id", { id: ticketId });
  }

  if (ticketNumber) {
    qb.andWhere("ticket.ticket_number = :ticket_number", {
      ticket_number: ticketNumber,
    });
  }

  const ticket = await qb.getOne();

  if (!ticket) {
    auditLog.step("Ticket not found");

    logger.info("[server][tickets] getSingleTicket | not found", { ticketId });
    return null;
  }

  logger.info("[server][tickets] getSingleTicket | found", {
    ticketId: ticket.id,
    ticket_number: ticket.ticket_number,
    requesterId: ticket.requester?.id ?? null,
    specializationId: ticket.specialization?.id ?? null,
    problemId: ticket.problem?.id ?? null,
    assigneeCount: ticket.assigneeList?.length ?? 0,
  });

  auditLog.step("Ticket found").metadata({
    requesterId: ticket.requester?.id ?? null,
    specializationId: ticket.specialization?.id ?? null,
    problemId: ticket.problem?.id ?? null,
    assigneeCount: ticket.assigneeList?.length ?? 0,
  });

  let university = null;
  let domain = null;
  let userDepartments: any[] = [];

  let resolvedDepartments: any[] = [];

  if (ticket.requester) {
    university = await ticket.requester.university;
    domain = await ticket.requester.domain;
    userDepartments = await ticket.requester.userDepartments;

    if (Array.isArray(userDepartments)) {
      resolvedDepartments = await Promise.all(
        userDepartments.map(async (link: any) => await link.department)
      );
    }
  }

  const managedSpecializationIds = await getManagedGroupSpecializationIds(
    user.id,
  );
  const specializationId = ticket.specialization?.id || null;
  const isRequester = ticket.requester?.id === user.id;
  const isAssignee =
    ticket.assigneeList?.some((assignee) => assignee.id === user.id) || false;
  const isManagedSpecialization =
    !!specializationId && managedSpecializationIds.includes(specializationId);
  const canAccess =
    user.role === UserType.SUPER_ADMIN ||
    (user.role === UserType.REQUESTER && isRequester) ||
    (user.role === UserType.TECHNICIAN &&
      (isAssignee || isManagedSpecialization)) ||
    (user.role === UserType.ADMIN &&
      (managedSpecializationIds.length === 0 ||
        isManagedSpecialization ||
        isAssignee));

  if (!canAccess) {
    throw new AppError("Ticket not found", 404);
  }

  const timing = getTicketTiming(ticket);

  const mappedTicket = {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    title: ticket.title,
    description: ticket.description,
    createdAt: ticket.createdAt,
    modifiedAt: ticket.modifiedAt,
    ...timing,
    requester: ticket.requester
      ? {
          id: ticket.requester.id,
          name: buildLocalizedName(ticket.requester, lang),
          image: ticket.requester.image,
          university: university
            ? {
                id: university.id,
                name: university.name?.[lang] || "",
              }
            : null,
          domain: domain
            ? {
                id: domain.id,
                name: domain.name?.[lang] || "",
              }
            : null,
          departments: resolvedDepartments
            .filter((dept: any) => dept && dept.id)
            .map((dept: any) => ({
              id: dept.id,
              name: dept.name?.[lang] || "",
            })),
        }
      : null,
    specialization: ticket.specialization
      ? {
          id: ticket.specialization.id,
          name: ticket.specialization.name?.[lang] || "",
          review_required: ticket.specialization.review_required,
        }
      : null,
    problem: ticket.problem
      ? {
          id: ticket.problem.id,
          name: ticket.problem.name?.[lang] || "",
          review_required: ticket.problem.review_required,
        }
      : null,
    // FIXME: status mapping should be result in remove `_` ex: `in_progress` => `in Progress`
    status: formatTicketStatus(ticket.status),
    priority: ticket.priority,
    isOutOfService: ticket.isOutOfService,
    assignee:
      ticket.assigneeList?.map((user) => ({
        id: user.id,
        name: buildLocalizedName(user, lang),
        image: user.image,
      })) || [],
    sla: await getTicketSlaState(ticket, lang),
  };

  auditLog.step("Logging ticket view activity");
  // log ticket view activity
  logTicketActivity(
    ticket,
    "Ticket Viewed",
    TicketActivityType.VIEW,
    `Ticket "${ticket.title}" was viewed by ${userName}`,
    user.id,
    { ticketId: ticket.id, ticket_number: ticket.ticket_number },
  );

  logger.info("[server][tickets] getSingleTicket | completed", {
    ticketId: mappedTicket.id,
    ticket_number: ticket.ticket_number,
    requesterId: mappedTicket.requester?.id ?? null,
    assigneeCount: mappedTicket.assignee.length,
  });
  auditLog.step("Completed ticket mapping").metadata({
    assigneeCount: mappedTicket.assignee.length,
    requesterId: mappedTicket.requester?.id ?? null,
  });

  return mappedTicket;
};
