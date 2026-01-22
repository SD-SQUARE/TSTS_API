import { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import {
  broadcastNotification,
  countUnreadNotifications,
  getNotificationById,
  listNotifications,
  markNotificationAsRead,
} from "../services/notification.service.js";
import { getNotificationsSchema } from "../validation/notification.schema.js";
import { NotificationType } from "../enums/NotificationType.enum.js";

export const getNotificationsController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;

  logger.info(
    "[server][notification][controller] getNotifications request received",
    {
      userId,
      query: req.query,
    },
  );

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  const parsed = getNotificationsSchema(t).safeParse(req.query);

  if (!parsed.success) {
    const msg = parsed.error.issues[0].message;
    logger.info("[server][notification][controller] validation failed", {
      msg,
    });
    throw new AppError(msg, 400);
  }

  const isRead =
    parsed.data.isRead === undefined
      ? undefined
      : parsed.data.isRead === "true";

  const notifications = await listNotifications(userId, isRead);

  return res.status(200).json(notifications);
};

export const getNotificationByIdController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  logger.info(
    "[server][notification][controller] getNotificationById request received",
    {
      userId,
      notificationId: id,
    },
  );

  const notification = await getNotificationById(userId, id);

  if (!notification) {
    throw new AppError(t("notification_not_found"), 404);
  }

  return res.status(200).json(notification);
};

export const getUnreadCountController = async (req: Request, res: Response) => {
  const t = req.t;
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  logger.info(
    "[server][notification][controller] getUnreadCount request received",
    {
      userId,
    },
  );

  const unread = await countUnreadNotifications(userId);

  return res.status(200).json({ unread });
};

export const markNotificationAsReadController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;
  const { id } = req.params;

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  logger.info(
    "[server][notification][controller] markNotificationAsRead request received",
    {
      userId,
      notificationId: id,
    },
  );

  const updated = await markNotificationAsRead(userId, id);

  if (!updated) {
    throw new AppError(t("notification_not_found"), 404);
  }

  return res.status(200).json(updated);
};

export const broadcastNotificationController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const { title, content, type, userIds } = req.body;

  // Validate type
  if (!Object.values(NotificationType).includes(type)) {
    throw new AppError(t("invalid_notification_type"), 400);
  }

  if (!title) {
    throw new AppError(t("title_required"), 400);
  }

  logger.info(
    "[server][notification][controller] broadcastNotification request received",
    {
      title,
      type,
      userCount: userIds?.length ?? 0,
    },
  );

  const notification = await broadcastNotification(
    type,
    title,
    content ?? null,
    userIds ?? [],
  );

  return res.status(201).json(notification);
};
