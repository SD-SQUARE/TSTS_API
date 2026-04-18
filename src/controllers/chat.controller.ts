import { Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import {
  getCombinedChatInbox,
  getGroupMessages,
  getPersonalMessages,
  getUnreadPersonalMessageCount,
  listGroupConversations,
  listPersonalConversations,
  sendGroupMessage,
  sendPersonalMessage,
} from "../services/chat.service.js";
import { sendPersonalMessageSchema } from "../validation/chat.schema.js";

export const sendPersonalMessageController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const senderId = (req as any).user?.id;
  const recipientId = req.params.userId;

  logger.info(
    "[server][chat][controller] sendPersonalMessage request received",
    {
      senderId,
      recipientId,
    },
  );

  if (!senderId) {
    throw new AppError(t("unauthorized"), 401);
  }

  if (!recipientId) {
    throw new AppError(t("recipient_id_required"), 400);
  }

  const validated = sendPersonalMessageSchema(t).safeParse(req.body);
  if (!validated.success) {
    const msg = validated.error.issues[0].message;
    logger.info("[server][chat][controller] Validation failed", { msg });
    throw new AppError(msg, 400);
  }

  const message = await sendPersonalMessage(
    senderId,
    recipientId,
    validated.data.content || "",
    req.files as Express.Multer.File[],
    t,
  );

  return res.status(201).json(message);
};

export const getPersonalMessagesController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const currentUserId = (req as any).user?.id;
  const otherUserId = req.params.userId;

  logger.info(
    "[server][chat][controller] getPersonalMessages request received",
    { currentUserId, otherUserId },
  );

  if (!currentUserId) {
    throw new AppError(t("unauthorized"), 401);
  }

  if (!otherUserId) {
    throw new AppError(t("user_id_required"), 400);
  }

  const messages = await getPersonalMessages(currentUserId, otherUserId);

  return res.status(200).json(messages);
};

export const getPersonalConversations = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  const conversations = await listPersonalConversations(userId);

  res.status(200).json(conversations);
};

export const getUnreadPersonalMessagesCount = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;

  logger.info(
    "[server][chat][controller] getUnreadPersonalMessagesCount request received",
    { userId },
  );

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  const unread = await getUnreadPersonalMessageCount(userId);

  logger.info(
    "[server][chat][controller] getUnreadPersonalMessagesCount response",
    { userId, unread },
  );

  return res.status(200).json({ unread });
};

export const sendGroupMessageController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const senderId = (req as any).user?.id;
  const groupId = req.params.groupId;

  logger.info("[server][chat][controller] sendGroupMessage request received", {
    senderId,
    groupId,
  });

  if (!senderId) {
    throw new AppError(t("unauthorized"), 401);
  }

  if (!groupId) {
    throw new AppError(t("group_id_required"), 400);
  }

  const validated = sendPersonalMessageSchema(t).safeParse(req.body);
  if (!validated.success) {
    const msg = validated.error.issues[0].message;
    logger.info("[server][chat][controller] Validation failed", { msg });
    throw new AppError(msg, 400);
  }

  const message = await sendGroupMessage(
    senderId,
    groupId,
    validated.data.content || "",
    req.files as Express.Multer.File[],
    t,
  );

  return res.status(201).json(message);
};

export const getGroupMessagesController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const currentUserId = (req as any).user?.id;
  const groupId = req.params.groupId;

  logger.info("[server][chat][controller] getGroupMessages request received", {
    currentUserId,
    groupId,
  });

  if (!currentUserId) {
    throw new AppError(t("unauthorized"), 401);
  }

  if (!groupId) {
    throw new AppError(t("group_id_required"), 400);
  }

  const messages = await getGroupMessages(currentUserId, groupId, t);

  return res.status(200).json(messages);
};

export const listGroupConversationsController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;

  logger.info(
    "[server][chat][controller] listGroupConversations request received",
    { userId },
  );

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  const conversations = await listGroupConversations(userId);

  return res.status(200).json(conversations);
};

export const getCombinedChatInboxController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const userId = (req as any).user?.id;

  logger.info(
    "[server][chat][controller] getCombinedChatInbox request received",
    { userId },
  );

  if (!userId) {
    throw new AppError(t("unauthorized"), 401);
  }

  const inbox = await getCombinedChatInbox(userId);

  return res.status(200).json(inbox);
};
