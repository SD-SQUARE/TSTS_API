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

const ticketRepo = PostgresDataSource.getRepository(Ticket);
const userRepo = PostgresDataSource.getRepository(User);
const mediaRepo = PostgresDataSource.getRepository(Media);
const specializationRepo = PostgresDataSource.getRepository(Specialization);
const ticketActivityRepo = PostgresDataSource.getRepository(TicketActivity);

export const logTicketActivity = async (
  ticket: Ticket,
  title: string,
  type: TicketActivityType,
  content: string,
  meta = {}
) => {
  const activity = ticketActivityRepo.create({
    ticket,
    title,
    content,
    type,
    meta,
  });
  await ticketActivityRepo.save(activity);
};

export const createTicket = async (dto, files) => {
  const { title, description, requester, specialization } = dto;

  const requesterUser = await userRepo.findOne({ where: { id: requester } });
  if (!requesterUser) {
    return {
      is_added: false,
      message: t("requester_not_found"),
      errors: [{ key: "requester", message: "Requester does not exist" }],
    };
  }

  let assignedUsers: User[] = [];
  if (specialization) {
    const assignedSpecialization = await specializationRepo.findOne({
      where: { id: specialization },
    });

    if (!assignedSpecialization) {
      return {
        is_added: false,
        message: t("specialization_not_found"),
        errors: [
          { key: "specialization", message: "specialization does not exist" },
        ],
      };
    }
  } else {
    // auto assign admins
    assignedUsers = await userRepo.find({
      where: { user_type: UserType.ADMIN },
    });
  }

  const ticket = ticketRepo.create({
    title,
    description,
    requester: requesterUser,
    specialization: specialization ? { id: specialization } : null,
    status: TicketStatus.OPEN,
    assigneeList: assignedUsers,
  });

  const savedTicket = await ticketRepo.save(ticket);

  // log ticket creation
  await logTicketActivity(
    savedTicket,
    "Ticket Created",
    TicketActivityType.FIRST_OPEN,
    `Ticket "${savedTicket.title}" created by ${requesterUser.id}`,
    {
      requesterId: requesterUser.id,
      specializationId: specialization || null,
      assignees: assignedUsers.map((u) => ({ id: u.id })),
    }
  );

  // handle media
  if (files?.length) {
    for (const file of files) {
      const key = await uploadFilesWithUniqueKey(
        IMAGE_PATHS.TicketMedia,
        ticket.id,
        file
      );

      const media = mediaRepo.create({
        name: file.originalname,
        url: key,
        mime: file.mimetype,
        ticket: savedTicket,
      });

      await mediaRepo.save(media);

      // log media upload
      await logTicketActivity(
        savedTicket,
        "Ticket Media Uploaded",
        TicketActivityType.INFO,
        `Media file "${file.originalname}" uploaded`,
        { fileName: file.originalname, url: key }
      );
    }
  }

  return {
    is_added: true,
    message: "ticket_created",
    errors: [],
  };
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
  userName: string
) => {
  logger.info("[server][tickets] getSingleTicket | start", { ticketId, lang });

  const ticket = await ticketRepo
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("ticket.specialization", "specialization")
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
  };

  // log ticket view activity
  logTicketActivity(
    ticket,
    "Ticket Viewed",
    TicketActivityType.VIEW,
    `Ticket "${ticket.title}" was viewed by ${userName}`,
    { ticketId: ticket.id,
      userId: userId,
     }
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
      `Fetched ${activities.length} activities for ticket ${ticketId}`
    );

    return activities;
  } catch (error) {
    logger.error(`Error fetching activities for ticket ${ticketId}: ${error}`);
    throw new Error("Could not fetch ticket activities");
  }
};
