import { PostgresDataSource } from "../database/postgres-data-source.js";
import { NotificationRead } from "../entities/NotificationRead.js";
import { Notification } from "../entities/Notification.js";
import logger from "../utils/logger.js";
import { User } from "../entities/User.js";
import { NotificationType } from "../enums/NotificationType.enum.js";
import { In } from "typeorm";
import { notificationUser } from "./socket.service.js";

const notificationRepo = PostgresDataSource.getRepository(Notification);
const userRepo = PostgresDataSource.getRepository(User);
const notificationReadRepo = PostgresDataSource.getRepository(NotificationRead);

const mapNotificationReadDto = (nr: NotificationRead) => ({
  id: nr.id,
  notification: {
    id: nr.notification.id,
    type: nr.notification.type,
    title: nr.notification.title,
    content: nr.notification.content,
    referenceId:
      nr.notification.ticketId ??
      nr.notification.chatMessageId ??
      nr.notification.extraReference ??
      null,
    createdAt: nr.notification.createdAt,
  },
  isRead: nr.isRead,
  createdAt: nr.createdAt,
});

export const listNotifications = async (userId: string, isRead?: boolean) => {
  logger.info("[server][notification][service] listNotifications start", {
    userId,
    isRead,
  });

  const query = notificationReadRepo
    .createQueryBuilder("nr")
    .leftJoinAndSelect("nr.notification", "notification")
    .where("nr.userId = :userId", { userId });

  if (typeof isRead === "boolean") {
    query.andWhere("nr.isRead = :isRead", { isRead });
  }

  const notifications = await query
    .orderBy("notification.createdAt", "DESC")
    .getMany();

  logger.info("[server][notification][service] listNotifications fetched", {
    userId,
    count: notifications.length,
  });

  return notifications.map(mapNotificationReadDto);
};

/**
 * Create a new notification and optionally assign it to one or more users
 * @param type NotificationType
 * @param title Notification title
 * @param content Optional content
 * @param userIds Array of user IDs to mark this notification as unread
 * @param references Optional references (ticketId, chatMessageId, extraReference)
 * @returns Created Notification entity
 */
export const createNotification = async (
  type: NotificationType,
  title: string,
  content: string | null = null,
  userIds: string[] = [],
  references?: {
    ticketId?: string;
    chatMessageId?: string;
    extraReference?: string;
  },
) => {
  logger.info("[server][notification][service] createNotification start", {
    type,
    title,
    userIds,
    references,
  });

  // Create notification
  const notification = notificationRepo.create({
    type,
    title,
    content,
    ticketId: references?.ticketId,
    chatMessageId: references?.chatMessageId,
    extraReference: references?.extraReference,
  });

  await notificationRepo.save(notification);

  // Create unread records for users
  if (userIds.length > 0) {
    const users = await userRepo.find({
      where: {
        id: In(userIds),
        deletedAt: null,
      },
    });
    const notificationReads: NotificationRead[] = [];

    for (const user of users) {
      const nr = notificationReadRepo.create({
        notification,
        user,
        isRead: false,
      });
      notificationReads.push(nr);
    }

    if (notificationReads.length > 0) {
      await notificationReadRepo.save(notificationReads);
      notificationReads.forEach((nr) => {
        notificationUser("notification:new", {
          userId: nr.user.id,
          notification: mapNotificationReadDto(nr),
        });
      });
    }
  }

  logger.info("[server][notification][service] createNotification completed", {
    notificationId: notification.id,
  });

  return notification;
};

export const getNotificationById = async (
  userId: string,
  notificationId: string,
) => {
  logger.info("[server][notification][service] getNotificationById start", {
    userId,
    notificationId,
  });

  const nr = await notificationReadRepo
    .createQueryBuilder("nr")
    .leftJoinAndSelect("nr.notification", "notification")
    .where("nr.userId = :userId", { userId })
    .andWhere("nr.notificationId = :notificationId", { notificationId })
    .getOne();

  if (!nr) {
    logger.info("[server][notification][service] notification not found", {
      userId,
      notificationId,
    });
    return null;
  }

  return mapNotificationReadDto(nr);
};

export const countUnreadNotifications = async (userId: string) => {
  logger.info(
    "[server][notification][service] countUnreadNotifications start",
    {
      userId,
    },
  );

  const count = await notificationReadRepo.count({
    where: { user: { id: userId }, isRead: false },
  });

  logger.info(
    "[server][notification][service] countUnreadNotifications fetched",
    {
      userId,
      count,
    },
  );

  return count;
};

export const markNotificationAsRead = async (
  userId: string,
  notificationId: string,
) => {
  logger.info("[server][notification][service] markNotificationAsRead start", {
    userId,
    notificationId,
  });

  // Find the NotificationRead record for this user and notification
  const nr = await notificationReadRepo.findOne({
    where: { user: { id: userId }, notification: { id: notificationId } },
    relations: ["notification"], // load the notification relation
  });

  if (!nr) {
    logger.info(
      "[server][notification][service] notification not found or not for user",
      {
        userId,
        notificationId,
      },
    );
    return null;
  }

  if (!nr.isRead) {
    nr.isRead = true;
    await notificationReadRepo.save(nr);
  }

  return mapNotificationReadDto(nr);
};

export const markAllNotificationsAsRead = async (userId: string) => {
  logger.info("[server][notification][service] markAllNotificationsAsRead start", {
    userId,
  });

  const unreadCount = await notificationReadRepo.count({
    where: { user: { id: userId }, isRead: false },
  });

  if (!unreadCount) {
    logger.info(
      "[server][notification][service] markAllNotificationsAsRead completed",
      {
        userId,
        updatedCount: 0,
      },
    );

    return { updatedCount: 0 };
  }

  await notificationReadRepo
    .createQueryBuilder()
    .update(NotificationRead)
    .set({ isRead: true })
    .where('"userId" = :userId', { userId })
    .andWhere('"isRead" = :isRead', { isRead: false })
    .execute();

  logger.info(
    "[server][notification][service] markAllNotificationsAsRead completed",
    {
      userId,
      updatedCount: unreadCount,
    },
  );

  return { updatedCount: unreadCount };
};

export const broadcastNotification = async (
  type: NotificationType,
  title: string,
  content: string | null = null,
  userIds: string[] = [],
) => {
  logger.info("[server][notification][service] broadcastNotification start", {
    type,
    title,
    userIds,
  });

  // Create notification
  const notification = notificationRepo.create({ type, title, content });
  await notificationRepo.save(notification);

  let notificationReads: NotificationRead[] = [];

  if (userIds.length > 0) {
    // Send to specific users
    const users = await userRepo.find({
      where: { id: In(userIds), deletedAt: null },
    });

    notificationReads = users.map((user) =>
      notificationReadRepo.create({
        notification,
        user,
        isRead: false,
      }),
    );
  } else {
    // Broadcast: send to all users
    const users = await userRepo.find({ where: { deletedAt: null } });
    notificationReads = users.map((user) =>
      notificationReadRepo.create({
        notification,
        user,
        isRead: false,
      }),
    );
  }

  if (notificationReads.length > 0) {
    await notificationReadRepo.save(notificationReads);
    notificationReads.forEach((nr) => {
      notificationUser("notification:new", {
        userId: nr.user.id,
        notification: mapNotificationReadDto(nr),
      });
    });
  }

  logger.info(
    "[server][notification][service] broadcastNotification completed",
    {
      notificationId: notification.id,
      recipients: notificationReads.length,
    },
  );

  return notification;
};
