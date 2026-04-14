import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { GroupHead, Ticket } from "../../../entities/index.js";
import { AuditAction } from "../../../enums/AuditAction.enum.js";
import { TicketActivityType } from "../../../enums/TicketActivity.enum.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { audit } from "../../../helpers/auditBuilder.js";
import { formatTicketStatus } from "../../../helpers/ticketsHelper.js";
import { Lang } from "../../../types/lang.types.js";
import { ReqUserPayload } from "../../../types/ReqUserPayload.js";
import { buildLocalizedName } from "../../../utils/localizeName.js";
import logger from "../../../utils/logger.js";
import { buildPagination } from "../../../utils/pagination.js";
import { GetTicketsQuery } from "../../../validation/ticket.schema.js";
import { logTicketActivity } from "../../tickets.service.js";
import { Request } from "express";

const ticketRepo = PostgresDataSource.getRepository(Ticket);

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

  const qb = ticketRepo
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("ticket.problem", "problem")
    .leftJoinAndSelect("ticket.assigneeList", "assignee");

  auditLog.step("Applying role-based filters");
  if (user.role === UserType.REQUESTER) {
    qb.andWhere("requester.id = :userId", {
      userId: user.id,
    });

    logger.info("[tickets] requester access applied", { userId: user.id });
  }

  if (user.role === UserType.TECHNICIAN) {
    qb.andWhere("assignee.id = :userId", {
      userId: user.id,
    });

    logger.info("[tickets] technician access applied", { userId: user.id });
  }

  if (user.role === UserType.ADMIN || user.role === UserType.SUPER_ADMIN) {
    const groupHeadRows = await PostgresDataSource.getRepository(GroupHead)
      .createQueryBuilder("gh")
      .innerJoin("gh.group", "g")
      .innerJoin("g.specializations", "gs")
      .innerJoin("gs.specialization", "s")
      .select("s.id", "specializationId")
      .where("gh.user = :userId", { userId: user.id })
      .getRawMany();

    const specializationIds: string[] = [
      ...new Set(groupHeadRows.map((row: any) => row.specializationId)),
    ];

    logger.info("[tickets] admin specializations resolved", {
      userId: user.id,
      userRole: user.role,
      specializationIds,
    });

    if (specializationIds.length === 0) {
      qb.andWhere("1 = 0");
    } else {
      console.log(specializationIds);
      qb.andWhere("specialization.id IN (:...adminSpecializations)", {
        adminSpecializations: specializationIds,
      });
    }
  }

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

  const mappedTickets = tickets.map((ticket) => ({
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    title: ticket.title,
    description: ticket.description,

    requester: ticket.requester
      ? {
          id: ticket.requester.id,
          name: buildLocalizedName(ticket.requester, lang),
          image: ticket.requester.image,
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

export const getSingleTicketService = async (
  ticketId: string | undefined,
  ticketNumber: number | undefined,
  lang: Lang,
  userId: string,
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

  const mappedTicket = {
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    title: ticket.title,
    description: ticket.description,
    requester: ticket.requester
      ? {
          id: ticket.requester.id,
          name: buildLocalizedName(ticket.requester, lang),
          image: ticket.requester.image,
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
  };

  auditLog.step("Logging ticket view activity");
  // log ticket view activity
  logTicketActivity(
    ticket,
    "Ticket Viewed",
    TicketActivityType.VIEW,
    `Ticket "${ticket.title}" was viewed by ${userName}`,
    userId,
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
