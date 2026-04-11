import { Ticket } from "../entities/Ticket.js";
import { User } from "../entities/User.js";
import { Media } from "../entities/Media.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { uploadFilesWithUniqueKey } from "../helpers/ImagesHelper.js";
import { UserType } from "../enums/UserType.enum.js";
import { IMAGE_PATHS } from "../constants/imagePathes.js";
import { Specialization } from "../entities/Specialization.js";
import { t } from "i18next";
import logger from "../utils/logger.js";
import { GetTicketsQuery } from "../validation/ticket.schema.js";
import { buildPagination } from "../utils/pagination.js";
import { buildLocalizedName } from "../utils/localizeName.js";
import { TicketActivity } from "../entities/TicketActivity.js";
import { TicketActivityType } from "../enums/TicketActivity.enum.js";
import { ReqUserPayload } from "../types/ReqUserPayload.js";
import { TicketReview } from "../entities/TicketReview.js";
import { getRequestContext } from "../utils/requestContext.js";
import { getUserMetaById } from "./tickets/common.js";
import { In } from "typeorm";
import { Problem } from "../entities/problem.js";
import { getPresignedUrl } from "../utils/storage.js";
import { formatTicketStatus } from "../helpers/ticketsHelper.js";
import { Group } from "../entities/Group.js";
import { Request } from "express";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

const ticketRepo = PostgresDataSource.getRepository(Ticket);
const userRepo = PostgresDataSource.getRepository(User);
const mediaRepo = PostgresDataSource.getRepository(Media);
const specializationRepo = PostgresDataSource.getRepository(Specialization);
const ticketActivityRepo = PostgresDataSource.getRepository(TicketActivity);
const ticketReviewRepo = PostgresDataSource.getRepository(TicketReview);
const problemRepo = PostgresDataSource.getRepository(Problem);
const groupRepo = PostgresDataSource.getRepository(Group);

export const logTicketActivity = async (
  ticket: Ticket,
  title: string,
  type: TicketActivityType,
  content: string,
  userId: string,
  meta: any = {},
  req?: Request,
) => {
  const context = getRequestContext(req);

  const finalMeta = {
    userId: userId || null,
    ip: context.ip || "unknown",
    ...meta,
  };

  const activity = ticketActivityRepo.create({
    ticket,
    title,
    content,
    type,
    meta: finalMeta,
  });

  await ticketActivityRepo.save(activity);
};

export const createTicket = async (dto, files, req?: Request) => {
  const auditLog = audit(req)
    .summary("Create Ticket")
    .action(AuditAction.CREATE_TICKET);
  // FIXME: Take Problem From body and update ticket entity
  const { title, description, requester, specialization, problem } = dto;

  logger.info("[tickets] createTicket | start", {
    requester,
    specialization,
    problem,
    hasFiles: !!files?.length,
  });

  auditLog.step("Validating requester").metadata({ requester });

  const requesterUser = await userRepo.findOne({ where: { id: requester } });

  if (!requesterUser) {
    auditLog.step("Requester not found");

    logger.warn("[tickets] createTicket | requester not found", {
      requester,
    });

    return {
      is_added: false,
      message: t("requester_not_found"),
      errors: [{ key: "requester", message: "Requester does not exist" }],
    };
  }

  logger.info("[tickets] createTicket | requester validated", {
    requesterId: requesterUser.id,
  });

  let assignedUsers: User[] = [];
  let assignedSpecialization: any = null;
  let assignedProblem: any = null;

  // FIXME: ticket should be created with problem and specialization
  if (specialization) {
    auditLog.step("Validating specialization").metadata({ specialization });

    logger.info("[tickets] createTicket | specialization provided", {
      specialization,
    });

    assignedSpecialization = await specializationRepo.findOne({
      where: { id: specialization },
      relations: [
        "groupSpecializations",
        "groupSpecializations.group",
        "groupSpecializations.group.heads",
        "groupSpecializations.group.heads.user",
        "groupSpecializations.group.teamLeader",
      ],
    });

    if (!assignedSpecialization) {
      auditLog.step("Specialization not found");

      logger.warn("[tickets] createTicket | specialization not found", {
        specialization,
      });

      return {
        is_added: false,
        message: t("specialization_not_found"),
        errors: [
          { key: "specialization", message: "Specialization does not exist" },
        ],
      };
    }

    logger.info("[tickets] createTicket | specialization resolved", {
      specializationId: assignedSpecialization.id,
    });
  }
  if (problem) {
    auditLog.step("Validating problem").metadata({ problem });

    logger.info("[tickets] createTicket | problem provided", {
      problem,
    });

    assignedProblem = await problemRepo.findOne({
      where: { id: problem },
    });

    if (!assignedProblem) {
      auditLog.step("Problem not found");

      logger.warn("[tickets] createTicket | problem not found", {
        problem,
      });

      return {
        is_added: false,
        message: t("problem_not_found"),
        errors: [{ key: "problem", message: "Problem does not exist" }],
      };
    }

    logger.info("[tickets] createTicket | problem resolved", {
      problemId: assignedProblem.id,
    });
  }

  auditLog.step("Assigning users");
  if (assignedSpecialization) {
    assignedUsers = await assignUsersFromSpecialization(assignedSpecialization);

    logger.info("[tickets] assigned from specialization", {
      specializationId: assignedSpecialization.id,
      assignedCount: assignedUsers.length,
    });
  } else {
    assignedUsers = await assignAllGroupHeadsAndLeaders();

    logger.info("[tickets] assigned from all groups", {
      assignedCount: assignedUsers.length,
    });
  }
  // if (assignedSpecialization) {
  //   assignedUsers = await assignUsersFromSpecialization(assignedSpecialization);

  //   logger.info("[tickets] createTicket | users assigned from specialization", {
  //     specializationId: assignedSpecialization.id,
  //     assignedCount: assignedUsers.length,
  //   });
  // }

  // if (!assignedUsers.length) {
  //   logger.info("[tickets] createTicket | fallback to admin assignment");

  //   assignedUsers = await userRepo.find({
  //     where: { user_type: UserType.ADMIN },
  //   });

  //   logger.info("[tickets] createTicket | admins assigned", {
  //     adminCount: assignedUsers.length,
  //   });
  // }

  const ticket = ticketRepo.create({
    title,
    description,
    requester: requesterUser,
    specialization: assignedSpecialization
      ? { id: assignedSpecialization.id }
      : null,
    problem: assignedProblem ? { id: assignedProblem.id } : null,
    status: TicketStatus.OPEN,
    assigneeList: assignedUsers,
  });

  logger.info("[tickets] createTicket | saving ticket", {
    requesterId: requesterUser.id,
    specializationId: assignedSpecialization?.id || null,
    problemId: assignedProblem?.id || null,
    assigneeCount: assignedUsers.length,
  });

  const savedTicket = await ticketRepo.save(ticket);

  auditLog.step("Ticket created").metadata({
    ticketId: savedTicket.id,
    assignees: assignedUsers.map((u) => u.id),
  });

  logger.info("[tickets] createTicket | ticket saved", {
    ticketId: savedTicket.id,
  });

  // log ticket creation
  await logTicketActivity(
    savedTicket,
    "Ticket Created",
    TicketActivityType.FIRST_OPEN,
    `Ticket "${savedTicket.title}" created by ${requesterUser.id}`,
    requesterUser.id,
    {
      specializationId: assignedSpecialization?.id || null,
      problemId: assignedProblem?.id || null,
      assignees: assignedUsers.map((u) => ({ id: u.id })),
    },
    req,
  );

  logger.info("[tickets] createTicket | activity logged", {
    ticketId: savedTicket.id,
  });

  // handle media
  if (files?.length) {
    auditLog.step("Uploading media").metadata({ fileCount: files.length });

    logger.info("[tickets] createTicket | uploading media", {
      ticketId: savedTicket.id,
      fileCount: files.length,
    });

    for (const file of files) {
      const key = await uploadFilesWithUniqueKey(
        IMAGE_PATHS.TicketMedia,
        savedTicket.id,
        file,
      );

      const media = mediaRepo.create({
        name: file.originalname,
        url: key,
        mime: file.mimetype,
        ticket: savedTicket,
      });

      await mediaRepo.save(media);

      logger.info("[tickets] createTicket | media saved", {
        ticketId: savedTicket.id,
        fileName: file.originalname,
      });

      // log media upload
      await logTicketActivity(
        savedTicket,
        "Ticket Media Uploaded",
        TicketActivityType.INFO,
        `Media file "${file.originalname}" uploaded`,
        requesterUser.id,
        { fileName: file.originalname, url: key },
        req,
      );
    }
  }

  auditLog
    .step("Ticket creation completed")
    .metadata({ ticketId: savedTicket.id });

  logger.info("[tickets] createTicket | completed successfully", {
    ticketId: savedTicket.id,
  });

  return {
    is_added: true,
    message: "ticket_created",
    errors: [],
  };
};

const assignUsersFromSpecialization = async (spec: any) => {
  const headIds = spec.groupSpecializations.flatMap(
    (gs: any) =>
      gs.group?.heads?.map((h: any) => h.user?.id).filter(Boolean) ?? [],
  );

  const teamLeaderIds = spec.groupSpecializations
    .map((gs: any) => gs.group?.teamLeader?.id)
    .filter(Boolean);

  const userIds = Array.from(new Set([...headIds, ...teamLeaderIds]));

  if (!userIds.length) return [];

  return await userRepo.findBy({ id: In(userIds) });
};

const assignAllGroupHeadsAndLeaders = async (): Promise<User[]> => {
  const groups = await groupRepo.find({
    relations: ["heads", "heads.user", "teamLeader"],
  });

  const headIds = groups.flatMap(
    (g) => g.heads?.map((h) => h.user?.id).filter(Boolean) ?? [],
  );

  const teamLeaderIds = groups.map((g) => g.teamLeader?.id).filter(Boolean);

  const userIds = Array.from(new Set([...headIds, ...teamLeaderIds]));

  if (!userIds.length) return [];

  return userRepo.findBy({ id: In(userIds) });
};
export const getAllTicketsService = async (
  query: GetTicketsQuery,
  lang: "ar" | "en",
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

  if (user.role === UserType.TECHNICIAN || user.role === UserType.ADMIN) {
    qb.andWhere("assignee.id = :userId", {
      userId: user.id,
    });

    logger.info("[tickets] technician access applied", { userId: user.id });
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
    qb.andWhere("specialization.id = :specialization", {
      specialization: query.specialization,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "specialization",
      specializationId: query.specialization,
    });
  }

  if (query.problem) {
    qb.andWhere("problem.id = :problem", {
      problem: query.problem,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "problem",
      problemId: query.problem,
    });
  }

  if (query.status) {
    qb.andWhere("ticket.status = :status", {
      status: query.status,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "status",
      status: query.status,
    });
  }

  if (query.priority) {
    qb.andWhere("ticket.priority = :priority", {
      priority: query.priority,
    });

    logger.info("[server][tickets] getAllTickets | filter applied", {
      filter: "priority",
      priority: query.priority,
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
  ticketId: string,
  lang: "ar" | "en",
  userId: string,
  userName: string,
  req?: Request,
) => {
  const auditLog = audit(req);
  logger.info("[server][tickets] getSingleTicket | start", { ticketId, lang });

  auditLog.step("Querying ticket from database");
  const ticket = await ticketRepo
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("ticket.problem", "problem")
    .leftJoinAndSelect("ticket.assigneeList", "assignee")
    .where("ticket.id = :id", { id: ticketId })
    .getOne();

  if (!ticket) {
    auditLog.step("Ticket not found");

    logger.info("[server][tickets] getSingleTicket | not found", { ticketId });
    return null;
  }

  logger.info("[server][tickets] getSingleTicket | found", {
    ticketId: ticket.id,
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
    { ticketId: ticket.id },
  );

  logger.info("[server][tickets] getSingleTicket | completed", {
    ticketId: mappedTicket.id,
    requesterId: mappedTicket.requester?.id ?? null,
    assigneeCount: mappedTicket.assignee.length,
  });
  auditLog.step("Completed ticket mapping").metadata({
    assigneeCount: mappedTicket.assignee.length,
    requesterId: mappedTicket.requester?.id ?? null,
  });

  return mappedTicket;
};

export const getTicketActivitiesService = async (
  ticketId: string,
  req?: Request,
) => {
  const auditLog = audit(req);

  try {
    const auditLog = audit(req);

    const activities = await ticketActivityRepo.find({
      where: { ticket: { id: ticketId } },
      order: { createdAt: "DESC" },
    });

    logger.info(
      `Fetched ${activities.length} activities for ticket ${ticketId}`,
    );

    auditLog
      .metadata({ activitiesCount: activities.length })
      .step("Activities retrieved");

    return await Promise.all(
      activities.map(async (activity) => {
        const userId = activity.meta?.userId;

        let userMeta = {
          full_name_en: null,
          full_name_ar: null,
          image: null,
          id: null,
        };

        if (userId) {
          userMeta = await getUserMetaById(userId);

          auditLog
            .metadata({ userId })
            .step("User metadata fetched for activity");

          if (userMeta?.image) {
            const imageUrl = await getPresignedUrl(
              process.env.MINIO_BUCKET!,
              userMeta.image,
              600,
            );

            userMeta.image = imageUrl;

            auditLog
              .metadata({ userId })
              .step("User image presigned URL generated");
          }
        }

        return {
          ...activity,
          meta: {
            ...activity.meta,
            user: userMeta,
          },
        };
      }),
    );
  } catch (error) {
    auditLog
      .metadata({ error: error.message })
      .step("Failed to fetch ticket activities");

    logger.error(`Error fetching activities for ticket ${ticketId}: ${error}`);
    throw new Error("Could not fetch ticket activities");
  }
};

export const createTicketReviewService = async (
  ticketId: string,
  dto: { rating: number; note?: string },
  user: any,
  auditLog?: ReturnType<typeof audit>,
) => {
  logger.info("[server][tickets][review] createTicketReview | start", {
    ticketId,
    userId: user.id,
    rating: dto.rating,
  });

  const ticket = await ticketRepo.findOne({
    where: { id: ticketId },
    relations: ["requester"],
  });

  if (!ticket) {
    logger.info("[server][tickets][review] ticket not found", {
      ticketId,
    });
    auditLog?.step("Ticket not found").metadata({ reason: "TICKET_NOT_FOUND" });

    return {
      status: 404,
      payload: {
        message: t("ticket_not_found"),
        code: "TICKET_NOT_FOUND",
      },
    };
  }

  auditLog?.step("Ticket fetched").metadata({
    status: ticket.status,
    closeCount: ticket.closeCount,
    requesterId: ticket.requester?.id,
  });

  logger.info("[server][tickets][review] ticket fetched", {
    ticketId: ticket.id,
    status: ticket.status,
    closeCount: ticket.closeCount,
    requesterId: ticket.requester?.id,
  });

  if (ticket.requester.id !== user.id) {
    logger.warn("[server][tickets][review] forbidden review attempt", {
      ticketId,
      requesterId: ticket.requester.id,
      attemptedBy: user.id,
    });

    auditLog?.step("Forbidden review attempt").metadata({
      attemptedBy: user.id,
      requesterId: ticket.requester.id,
    });

    return {
      status: 403,
      payload: {
        message: t("action_not_allowed"),
        code: "FORBIDDEN",
      },
    };
  }

  let closeCycle = ticket.closeCount;

  if (![TicketStatus.CLOSED, TicketStatus.RESOLVED].includes(ticket.status)) {
    logger.info("[server][tickets][review] closing ticket before review", {
      ticketId,
      previousStatus: ticket.status,
      previousCloseCount: ticket.closeCount,
    });

    auditLog?.step("Ticket closed before review").metadata({
      previousStatus: ticket.status,
      newCloseCount: closeCycle,
    });

    closeCycle += 1;
    ticket.status = TicketStatus.CLOSED;
    ticket.closeCount = closeCycle;

    await ticketRepo.save(ticket);

    logger.info("[server][tickets][review] ticket closed successfully", {
      ticketId,
      newStatus: ticket.status,
      newCloseCount: ticket.closeCount,
    });
  }

  const existingReview = await ticketReviewRepo.findOne({
    where: {
      ticket: { id: ticket.id },
      closeCycle: closeCycle,
    },
  });

  if (existingReview) {
    logger.warn("[server][tickets][review] duplicate review detected", {
      ticketId,
      closeCycle,
      reviewerId: user.id,
    });

    auditLog?.step("Duplicate review detected").metadata({ closeCycle });

    return {
      status: 409,
      payload: {
        message: "Review already exists for this close cycle",
        code: "REVIEW_ALREADY_EXISTS",
      },
    };
  }

  const review = ticketReviewRepo.create({
    rating: dto.rating,
    note: dto.note,
    closeCycle: closeCycle,
    ticket,
    reviewer: { id: user.id },
  });

  await ticketReviewRepo.save(review);

  auditLog?.step("Review saved").metadata({ reviewId: review.id, closeCycle });

  logger.info("[server][tickets][review] review saved", {
    ticketId,
    reviewId: review.id,
    rating: dto.rating,
    closeCycle,
  });

  // Log ticket activity
  await logTicketActivity(
    ticket,
    "Ticket Reviewed",
    TicketActivityType.INFO,
    `Ticket reviewed with rating ${dto.rating} by user ${user.id}`,
    user.id,
    {
      rating: dto.rating,
      closeCycle: closeCycle,
    },
  );

  auditLog?.step("Ticket activity logged");

  logger.info("[server][tickets][review] activity logged", {
    ticketId,
    closeCycle,
  });

  logger.info("[server][tickets][review] completed successfully", {
    ticketId,
    reviewerId: user.id,
    closeCycle,
  });

  return {
    status: 201,
    payload: {
      is_added: true,
      message: "review_created_successfully",
      errors: [],
    },
  };
};

export const getTicketReviewsService = async (
  ticketId: string,
  user: any,
  t: any,
  auditLog?: ReturnType<typeof audit>,
) => {
  logger.info("[server][tickets][review] getTicketReviews | start", {
    ticketId,
    userId: user.id,
  });

  const ticket = await ticketRepo.findOne({
    where: { id: ticketId },
    relations: ["requester", "assigneeList"],
  });

  if (!ticket) {
    logger.info("[server][tickets][review] ticket not found", {
      ticketId,
      requestedBy: user.id,
    });

    auditLog?.step("Ticket not found").metadata({ reason: "TICKET_NOT_FOUND" });

    return {
      status: 404,
      payload: {
        message: t("ticket_not_found"),
        code: "TICKET_NOT_FOUND",
      },
    };
  }

  logger.info("[server][tickets][review] ticket fetched", {
    ticketId: ticket.id,
    requesterId: ticket.requester?.id,
    assigneeCount: ticket.assigneeList?.length || 0,
  });

  auditLog?.step("Ticket fetched").metadata({
    requesterId: ticket.requester?.id,
    assigneeCount: ticket.assigneeList?.length || 0,
  });

  const isRequester = ticket.requester.id === user.id;

  const isAssignee = ticket.assigneeList?.some(
    (assignee) => assignee.id === user.id,
  );

  const isAllowed = user.role === UserType.ADMIN || isRequester || isAssignee;

  if (!isAllowed) {
    logger.warn("[server][tickets][review] forbidden access attempt", {
      ticketId,
      requestedBy: user.id,
      isAdmin: user.role === UserType.ADMIN,
      isRequester,
      isAssignee,
    });

    auditLog?.step("Forbidden access attempt").metadata({
      attemptedBy: user.id,
      isAdmin: user.role === UserType.ADMIN,
      isRequester,
      isAssignee,
    });

    return {
      status: 403,
      payload: {
        message: t("action_not_allowed"),
        code: "FORBIDDEN",
      },
    };
  }

  const reviews = await ticketReviewRepo.find({
    where: { ticket: { id: ticketId } },
    relations: ["reviewer"],
    order: { createdAt: "DESC" },
  });

  auditLog?.step("Reviews fetched").metadata({ reviewsCount: reviews.length });

  logger.info("[server][tickets][review] reviews fetched", {
    ticketId,
    requestedBy: user.id,
    reviewsCount: reviews.length,
  });

  const formatted = await Promise.all(
    reviews.map(async (review) => ({
      id: review.id,
      ticketId: ticket.id,
      rating: review.rating,
      note: review.note,
      closeCycle: review.closeCycle,
      createdAt: review.createdAt,
      reviewer: {
        id: review.reviewer.id,
        firstName: review.reviewer.firstName,
        lastName: review.reviewer.lastName,
        image: review.reviewer.image
          ? await getPresignedUrl(
              process.env.MINIO_BUCKET!,
              review.reviewer.image,
              600,
            )
          : null,
      },
    })),
  );

  await logTicketActivity(
    ticket,
    "Ticket Reviews Viewed",
    TicketActivityType.INFO,
    `Ticket reviews viewed by user ${user.id}`,
    user.id,
    {
      reviewsCount: formatted.length,
    },
  );

  logger.info("[server][tickets][review] activity logged", {
    ticketId,
    userId: user.id,
  });

  logger.info("[server][tickets][review] completed successfully", {
    ticketId,
    userId: user.id,
  });

  auditLog
    ?.step("Ticket activity logged")
    .metadata({ reviewsCount: formatted.length });
  auditLog?.step("Completed successfully");

  return {
    status: 200,
    payload: {
      data: formatted,
      meta: {
        total: formatted.length,
      },
    },
  };
};

export const changeTicketStatusService = async (
  ticketId: string,
  dto: { status: TicketStatus },
  user: any,
  t: any,
  auditLog?: ReturnType<typeof audit>,
  req?: Request,
) => {
  logger.info("[server][tickets] changeTicketStatus | start", {
    ticketId,
    userId: user.id,
    requestedStatus: dto.status,
  });

  const ticket = await ticketRepo.findOne({
    where: { id: ticketId },
    relations: ["requester", "assigneeList", "specialization", "problem"],
  });

  if (!ticket) {
    logger.warn("[server][tickets] ticket not found", {
      ticketId,
      requestedBy: user.id,
    });
    auditLog?.step("Ticket not found").metadata({ reason: "TICKET_NOT_FOUND" });

    return {
      status: 404,
      payload: {
        message: t("ticket_not_found"),
        code: "TICKET_NOT_FOUND",
      },
    };
  }

  auditLog?.step("Ticket fetched").metadata({
    requesterId: ticket.requester?.id,
    assigneeCount: ticket.assigneeList?.length || 0,
    previousStatus: ticket.status,
  });

  const isRequester = ticket.requester?.id === user.id;

  const isAssignee = ticket.assigneeList?.some(
    (assignee) => assignee.id === user.id,
  );

  const isAdmin = user.role === UserType.ADMIN;
  // FIXME: Requester should be able to change status to re_open and
  // also if specialization or problem has review_required set to true  let requester change status to closed

  let isAllowed = false;

  if (isAdmin || isAssignee) {
    isAllowed = true;
  } else if (isRequester) {
    if (
      dto.status === TicketStatus.REOPEN ||
      dto.status === TicketStatus.RESOLVED
    ) {
      isAllowed = true;
    }
  }

  if (!isAllowed) {
    logger.warn("[server][tickets] forbidden status change attempt", {
      ticketId,
      requestedBy: user.id,
      isAdmin: user.role === UserType.ADMIN,
      isAssignee,
    });

    auditLog?.step("Forbidden status change attempt").metadata({
      attemptedBy: user.id,
      isAdmin,
      isAssignee,
      requestedStatus: dto.status,
    });

    return {
      status: 403,
      payload: {
        message: t("action_not_allowed"),
        code: "FORBIDDEN",
      },
    };
  }

  const previousStatus = ticket.status;

  let newStatus = dto.status;

  if (dto.status === TicketStatus.CLOSED) {
    const reviewRequired =
      ticket.specialization?.review_required || ticket.problem?.review_required;

    if (reviewRequired) {
      const existingReview = await ticketReviewRepo.findOne({
        where: {
          ticket: { id: ticket.id },
          closeCycle: ticket.closeCount + 1,
        },
      });

      if (!existingReview) {
        logger.info(
          "[tickets] review required but not found → switching to PENDING",
          { ticketId: ticket.id },
        );

        newStatus = TicketStatus.PENDING;
      } else {
        ticket.closeCount += 1;
      }
    } else {
      ticket.closeCount += 1;
    }
  }

  logger.info("[server][tickets] updating ticket status", {
    ticketId,
    previousStatus,
    newStatus,
  });

  ticket.status = newStatus;
  await ticketRepo.save(ticket);

  auditLog
    ?.step("Ticket status updated")
    .metadata({ previousStatus, newStatus, closeCycle: ticket.closeCount });

  await logTicketActivity(
    ticket,
    "Ticket Status Changed",
    TicketActivityType.INFO,
    `Ticket status changed from ${previousStatus} to ${newStatus} by user ${user.id}`,
    user.id,
    {
      previousStatus,
      newStatus,
      closeCycle: ticket.closeCount,
      old: previousStatus,
      new: newStatus,
    },
    req,
  );

  auditLog
    ?.step("Ticket activity logged")
    .metadata({ previousStatus, newStatus });

  logger.info("[server][tickets] ticket status updated successfully", {
    ticketId,
    previousStatus,
    newStatus,
    closeCycle: ticket.closeCount,
  });

  auditLog?.step("Completed successfully");

  return {
    status: 200,
    payload: {
      is_updated: true,
      message: t("ticket_updated"),
      errors: [],
    },
  };
};
