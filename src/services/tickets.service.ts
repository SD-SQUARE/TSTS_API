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
import { Problem } from "../entities/Problem.js";

const ticketRepo = PostgresDataSource.getRepository(Ticket);
const userRepo = PostgresDataSource.getRepository(User);
const mediaRepo = PostgresDataSource.getRepository(Media);
const specializationRepo = PostgresDataSource.getRepository(Specialization);
const ticketActivityRepo = PostgresDataSource.getRepository(TicketActivity);
const ticketReviewRepo = PostgresDataSource.getRepository(TicketReview);
const problemRepo = PostgresDataSource.getRepository(Problem);

export const logTicketActivity = async (
  ticket: Ticket,
  title: string,
  type: TicketActivityType,
  content: string,
  userId: string,
  meta: any = {},
) => {
  const context = getRequestContext();

  const userMeta = userId
    ? await getUserMetaById(userId)
    : { full_name_en: null, full_name_ar: null, image: null, id: null };

  const finalMeta = {
    user: userMeta,
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

export const createTicket = async (dto, files) => {
  // FIXME: Take Problem From body and update ticket entity
  const { title, description, requester, specialization, problem } = dto;

  logger.info("[tickets] createTicket | start", {
    requester,
    specialization,
    problem,
    hasFiles: !!files?.length,
  });

  const requesterUser = await userRepo.findOne({ where: { id: requester } });

  if (!requesterUser) {
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
  } else if (problem) {
    logger.info(
      "[tickets] createTicket | deriving specialization from problem",
      {
        problem,
      },
    );

    assignedProblem = await problemRepo.findOne({
      where: { id: problem },
      relations: [
        "specialization",
        "specialization.groupSpecializations",
        "specialization.groupSpecializations.group",
        "specialization.groupSpecializations.group.heads",
        "specialization.groupSpecializations.group.heads.user",
        "specialization.groupSpecializations.group.teamLeader",
      ],
    });

    if (!assignedProblem) {
      logger.warn("[tickets] createTicket | problem not found", {
        problem,
      });

      return {
        is_added: false,
        message: t("problem_not_found"),
        errors: [{ key: "problem", message: "Problem does not exist" }],
      };
    }

    assignedSpecialization = assignedProblem.specialization;

    logger.info("[tickets] createTicket | specialization derived", {
      problemId: assignedProblem.id,
      specializationId: assignedSpecialization?.id,
    });
  }

  if (assignedSpecialization) {
    assignedUsers = await assignUsersFromSpecialization(assignedSpecialization);

    logger.info("[tickets] createTicket | users assigned from specialization", {
      specializationId: assignedSpecialization.id,
      assignedCount: assignedUsers.length,
    });
  }

  if (!assignedUsers.length) {
    logger.info("[tickets] createTicket | fallback to admin assignment");

    assignedUsers = await userRepo.find({
      where: { user_type: UserType.ADMIN },
    });

    logger.info("[tickets] createTicket | admins assigned", {
      adminCount: assignedUsers.length,
    });
  }

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
  );

  logger.info("[tickets] createTicket | activity logged", {
    ticketId: savedTicket.id,
  });

  // handle media
  if (files?.length) {
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
      );
    }
  }

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
      gs.group.heads?.map((h: any) => h.user?.id).filter(Boolean) ?? [],
  );

  const teamLeaderIds = spec.groupSpecializations
    .map((gs: any) => gs.group.teamLeader?.id)
    .filter(Boolean);

  const userIds = Array.from(new Set([...headIds, ...teamLeaderIds]));

  if (!userIds.length) return [];

  return await userRepo.findBy({ id: In(userIds) });
};

export const getAllTicketsService = async (
  query: GetTicketsQuery,
  lang: "ar" | "en",
  user: ReqUserPayload,
) => {
  logger.info("[server][tickets] getAllTickets | start", {
    lang,
    query,
  });

  const { skip, take, meta } = buildPagination({
    page: query.page_index,
    limit: query.page_size,
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

  logger.info("[server][tickets] getAllTickets | base query initialized");

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

  const [tickets, total] = await qb.getManyAndCount();

  logger.info("[server][tickets] getAllTickets | query executed", {
    returnedCount: tickets.length,
    totalCount: total,
  });

  logger.info("[server][tickets] getAllTickets | mapping tickets", {
    ticketsCount: tickets.length,
    lang,
  });

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

    status: ticket.status,
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
) => {
  logger.info("[server][tickets] getSingleTicket | start", { ticketId, lang });

  const ticket = await ticketRepo
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("ticket.problem", "problem")
    .leftJoinAndSelect("ticket.assigneeList", "assignee")
    .where("ticket.id = :id", { id: ticketId })
    .getOne();

  if (!ticket) {
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
    status: ticket.status,
    priority: ticket.priority,
    isOutOfService: ticket.isOutOfService,
    assignee:
      ticket.assigneeList?.map((user) => ({
        id: user.id,
        name: buildLocalizedName(user, lang),
        image: user.image,
      })) || [],
  };

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

  return mappedTicket;
};

export const getTicketActivitiesService = async (ticketId: string) => {
  try {
    const activities = await ticketActivityRepo.find({
      where: { ticket: { id: ticketId } },
      order: { createdAt: "DESC" },
    });

    logger.info(
      `Fetched ${activities.length} activities for ticket ${ticketId}`,
    );

    return activities;
  } catch (error) {
    logger.error(`Error fetching activities for ticket ${ticketId}: ${error}`);
    throw new Error("Could not fetch ticket activities");
  }
};

export const createTicketReviewService = async (
  ticketId: string,
  dto: { rating: number; note?: string },
  user: any,
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

    return {
      status: 403,
      payload: {
        message: t("action_not_allowed"),
        code: "FORBIDDEN",
      },
    };
  }

  let closeCycle = ticket.closeCount;

  if (ticket.status !== TicketStatus.CLOSED) {
    logger.info("[server][tickets][review] closing ticket before review", {
      ticketId,
      previousStatus: ticket.status,
      previousCloseCount: ticket.closeCount,
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

  logger.info("[server][tickets][review] reviews fetched", {
    ticketId,
    requestedBy: user.id,
    reviewsCount: reviews.length,
  });

  const formatted = reviews.map((review) => ({
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
      image: review.reviewer.image,
    },
  }));

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
) => {
  logger.info("[server][tickets] changeTicketStatus | start", {
    ticketId,
    userId: user.id,
    requestedStatus: dto.status,
  });

  const ticket = await ticketRepo.findOne({
    where: { id: ticketId },
    relations: ["requester", "assigneeList"],
  });

  if (!ticket) {
    logger.warn("[server][tickets] ticket not found", {
      ticketId,
      requestedBy: user.id,
    });
    return {
      status: 404,
      payload: {
        message: t("ticket_not_found"),
        code: "TICKET_NOT_FOUND",
      },
    };
  }

  const isAssignee = ticket.assigneeList?.some(
    (assignee) => assignee.id === user.id,
  );

  const isAllowed = user.role === UserType.ADMIN || isAssignee;
  // FIXME: Requester should be able to change status to re_open and 
  // also if specialization or problem has review_required set to true  let requester change status to closed
  if (!isAllowed) {
    logger.warn("[server][tickets] forbidden status change attempt", {
      ticketId,
      requestedBy: user.id,
      isAdmin: user.role === UserType.ADMIN,
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

  const previousStatus = ticket.status;

  let newStatus = dto.status;

  if (dto.status === TicketStatus.CLOSED) {
    ticket.closeCount += 1;
    logger.info("[server][tickets] incrementing close cycle", {
      ticketId,
      newCloseCycle: ticket.closeCount,
    });
  }

  logger.info("[server][tickets] updating ticket status", {
    ticketId,
    previousStatus,
    newStatus,
  });

  ticket.status = newStatus;
  await ticketRepo.save(ticket);

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
    },
  );

  logger.info("[server][tickets] ticket status updated successfully", {
    ticketId,
    previousStatus,
    newStatus,
    closeCycle: ticket.closeCount,
  });

  return {
    status: 200,
    payload: {
      is_updated: true,
      message: "ticket_updated",
      errors: [],
    },
  };
};
