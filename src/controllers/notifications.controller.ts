import { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import {
  broadcastNotification,
  deleteNotifications,
  countUnreadNotifications,
  getNotificationById,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification.service.js";
import { getCombinedChatInbox } from "../services/chat.service.js";
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
  const page = parsed.data.page ? Number(parsed.data.page) : 1;
  const pageSize = parsed.data.pageSize ? Number(parsed.data.pageSize) : 10;

  const notifications = await listNotifications(userId, isRead, page, pageSize);

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

export const markAllNotificationsAsReadController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  logger.info(
    "[server][notification][controller] markAllNotificationsAsRead request received",
    {
      userId,
    },
  );

  const result = await markAllNotificationsAsRead(userId);

  return res.status(200).json(result);
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

export const deleteNotificationsController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  if (!ids.length) {
    throw new AppError(t("invalid_input"), 400);
  }

  try {
    const result = await deleteNotifications(userId, ids);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error?.message === "UNREAD_NOTIFICATIONS_CANNOT_BE_DELETED") {
      throw new AppError(t("invalid_input"), 400);
    }

    throw error;
  }
};

export const getBootstrapInboxController = async (req: Request, res: Response) => {
  const t = req.t;
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  logger.info("[server][bootstrap][controller] getBootstrapInbox request received", { userId });

  // ── Event-Loop Delay Monitor ─────────────────────────────────────────────────
  // Samples event-loop lag every 10ms. High mean/max here is causation proof
  // that chat hydration is blocking the JS thread.
  const { monitorEventLoopDelay } = await import("perf_hooks");
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();

  const tStart = performance.now();
  const [unreadCount, notifications, chatInbox] = await Promise.all([
    countUnreadNotifications(userId),
    listNotifications(userId, undefined, 1, 10),
    getCombinedChatInbox(userId),
  ]);
  const totalMs = (performance.now() - tStart).toFixed(2);

  histogram.disable();

  // histogram values are in nanoseconds
  const nsToMs = (ns: number) => (ns / 1e6).toFixed(2);
  logger.info("[server][bootstrap][controller] getBootstrapInbox completed", {
    userId,
    totalMs,
    eventLoop: {
      meanMs: nsToMs(histogram.mean),
      maxMs: nsToMs(histogram.max),
      p95Ms: nsToMs(histogram.percentile(95)),
      p99Ms: nsToMs(histogram.percentile(99)),
      stddevMs: nsToMs(histogram.stddev),
    },
  });

  return res.status(200).json({ unreadCount, notifications, chatInbox });
};
