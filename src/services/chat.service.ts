import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { ChatMessage } from "../entities/ChatMessage.js";
import { User } from "../entities/User.js";
import { Media } from "../entities/Media.js";
import { v4 as uuid } from "uuid";
import { uploadFile } from "../utils/storage.js";
import { Group } from "../entities/Group.js";
import { createNotification } from "./notification.service.js";
import { NotificationType } from "../enums/NotificationType.enum.js";
import { TechnicianGroup } from "../entities/TechnicianGroup.js";
import { Not } from "typeorm";

const chatRepository = PostgresDataSource.getRepository(ChatMessage);
const usersRepository = PostgresDataSource.getRepository(User);
const mediaRepository = PostgresDataSource.getRepository(Media);
const groupRepository = PostgresDataSource.getRepository(Group);
const technicianGroupRepo = PostgresDataSource.getRepository(TechnicianGroup);

export const sendPersonalMessage = async (
  senderId: string,
  recipientId: string,
  content: string,
  files: Express.Multer.File[],
  t: any,
) => {
  logger.info("[server][chat][service] sendPersonalMessage start", {
    senderId,
    recipientId,
  });

  const sender = await usersRepository.findOne({
    where: { id: senderId, deletedAt: null },
  });

  const recipient = await usersRepository.findOne({
    where: { id: recipientId, deletedAt: null },
  });

  if (!sender || !recipient) {
    throw new AppError(t("user_not_found"), 404);
  }

  // Create message first
  const message = chatRepository.create({
    sender,
    recipient,
    content,
    attachments: [],
    isRead: false,
  });

  await chatRepository.save(message);

  if (files?.length) {
    const mediaEntities: Media[] = [];

    for (const file of files) {
      const key = `chat/${message.id}/${uuid()}-${file.originalname}`;

      await uploadFile(
        process.env.MINIO_BUCKET!,
        key,
        file.buffer,
        file.mimetype,
      );

      const media = mediaRepository.create({
        name: file.originalname,
        mime: file.mimetype,
        url: key,
      });

      await mediaRepository.save(media);
      mediaEntities.push(media);
    }

    message.attachments = mediaEntities;
    await chatRepository.save(message);
  }

  logger.info("[server][chat][service] Message sent successfully", {
    messageId: message.id,
  });

  // Create notification for the recipient
  await createNotification(
    NotificationType.MESSAGE,
    "New message",
    content,
    [recipient.id],
    { chatMessageId: message.id },
  );

  return {
    id: message.id,
    senderId: sender.id,
    recipientId: recipient.id,
    groupId: null,
    content: message.content,
    attachments: message.attachments.map((m) => ({
      id: m.id,
      name: m.name,
      url: m.url,
      mime: m.mime,
    })),
    createdAt: message.createdAt,
  };
};

export const getPersonalMessages = async (
  currentUserId: string,
  otherUserId: string,
) => {
  logger.info("[server][chat][service] getPersonalMessages start", {
    currentUserId,
    otherUserId,
  });

  const usersCount = await usersRepository.count({
    where: [{ id: currentUserId }, { id: otherUserId }],
  });

  if (usersCount !== 2) {
    throw new AppError("user_not_found", 404);
  }

  const messages = await chatRepository
    .createQueryBuilder("message")
    .leftJoinAndSelect("message.sender", "sender")
    .leftJoinAndSelect("message.recipient", "recipient")
    .leftJoinAndSelect("message.attachments", "attachments")
    .where(
      `(sender.id = :currentUserId AND recipient.id = :otherUserId)
       OR
       (sender.id = :otherUserId AND recipient.id = :currentUserId)`,
      { currentUserId, otherUserId },
    )
    .orderBy("message.createdAt", "ASC")
    .getMany();

  logger.info("[server][chat][service] Messages fetched successfully", {
    count: messages.length,
  });

  const unreadMessages = messages.filter(
    (msg) => msg.recipient?.id === currentUserId && !msg.isRead,
  );

  if (unreadMessages.length) {
    await chatRepository
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .whereInIds(unreadMessages.map((m) => m.id))
      .execute();
  }

  return messages.map((message) => ({
    id: message.id,
    senderId: message.sender.id,
    recipientId: message.recipient?.id ?? null,
    groupId: null,
    content: message.content,
    attachments:
      message.attachments?.map((m) => ({
        id: m.id,
        name: m.name,
        url: m.url,
        mime: m.mime,
      })) || [],
    createdAt: message.createdAt,
  }));
};

export const listPersonalConversations = async (currentUserId: string) => {
  const lastMessages = await chatRepository.query(
    `
    SELECT DISTINCT ON (
      LEAST(m."senderId", m."recipientId"),
      GREATEST(m."senderId", m."recipientId")
    )
      m.id,
      m.content,
      m."createdAt",
      m."senderId",
      m."recipientId",
      CASE 
        WHEN m."senderId" = $1 THEN u."firstName"
        ELSE s."firstName"
      END as "otherUserName"
    FROM chat_messages m
    LEFT JOIN "users" s ON m."senderId" = s.id
    LEFT JOIN "users" u ON m."recipientId" = u.id
    WHERE m."senderId" = $1 OR m."recipientId" = $1
    ORDER BY
      LEAST(m."senderId", m."recipientId"),
      GREATEST(m."senderId", m."recipientId"),
      m."createdAt" DESC
    `,
    [currentUserId],
  );

  const conversations = await Promise.all(
    lastMessages.map(async (msg: any) => {
      const otherUserId =
        msg.senderId === currentUserId ? msg.recipientId : msg.senderId;

      const unreadCount = await getUnreadPersonalMessageCount(currentUserId);

      return {
        userId: otherUserId,
        name: msg.otherUserName ?? "",
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        unreadCount,
      };
    }),
  );

  return conversations;
};

export const getUnreadPersonalMessageCount = async (
  userId: string,
): Promise<number> => {
  const unreadCount = await chatRepository.count({
    where: {
      recipient: { id: userId },
      isRead: false,
    },
  });

  return unreadCount;
};

export const sendGroupMessage = async (
  senderId: string,
  groupId: string,
  content: string,
  files: Express.Multer.File[],
  t: any,
) => {
  logger.info("[server][chat][service] sendGroupMessage start", {
    senderId,
    groupId,
  });

  const sender = await usersRepository.findOne({
    where: { id: senderId, deletedAt: null },
  });

  if (!sender) {
    throw new AppError(t("user_not_found"), 404);
  }

  const group = await groupRepository.findOne({
    where: { id: groupId },
  });

  if (!group) {
    throw new AppError(t("group_not_found"), 404);
  }

  // Create message
  const message = chatRepository.create({
    sender,
    group,
    content,
    attachments: [],
  });

  await chatRepository.save(message);

  // Handle attachments
  if (files?.length) {
    const mediaEntities: Media[] = [];

    for (const file of files) {
      const key = `chat/groups/${groupId}/${message.id}/${uuid()}-${file.originalname}`;

      await uploadFile(
        process.env.MINIO_BUCKET!,
        key,
        file.buffer,
        file.mimetype,
      );

      const media = mediaRepository.create({
        name: file.originalname,
        mime: file.mimetype,
        url: key,
      });

      await mediaRepository.save(media);
      mediaEntities.push(media);
    }

    message.attachments = mediaEntities;
    await chatRepository.save(message);
  }

  // Fetch all active group members except sender
  const groupUsers = await technicianGroupRepo.find({
    where: {
      group: { id: group.id },
      user: {
        deletedAt: null,
        id: Not(sender.id),
      },
    },
    relations: ["user"],
  });

  const userIds = groupUsers.map((gu) => gu.user.id);

  if (userIds.length > 0) {
    await createNotification(
      NotificationType.MESSAGE,
      `New message in group ${group.name?.en || ""}`,
      content,
      userIds,
      { chatMessageId: message.id },
    );
  }

  logger.info("[server][chat][service] Group message sent successfully", {
    messageId: message.id,
    groupId,
  });

  return {
    id: message.id,
    senderId: sender.id,
    recipientId: null,
    groupId: group.id,
    content: message.content,
    attachments: message.attachments.map((m) => ({
      id: m.id,
      name: m.name,
      url: m.url,
      mime: m.mime,
    })),
    createdAt: message.createdAt,
  };
};

export const getGroupMessages = async (groupId: string) => {
  logger.info("[server][chat][service] getGroupMessages start", {
    groupId,
  });

  const group = await groupRepository.findOne({
    where: { id: groupId },
  });

  if (!group) {
    throw new AppError("group_not_found", 404);
  }

  const messages = await chatRepository
    .createQueryBuilder("message")
    .leftJoinAndSelect("message.sender", "sender")
    .leftJoinAndSelect("message.group", "group")
    .leftJoinAndSelect("message.attachments", "attachments")
    .where("group.id = :groupId", { groupId })
    .orderBy("message.createdAt", "ASC")
    .getMany();

  logger.info("[server][chat][service] group messages fetched", {
    groupId,
    count: messages.length,
  });

  return messages.map((message) => ({
    id: message.id,
    senderId: message.sender.id,
    recipientId: null,
    groupId: message.group?.id ?? null,
    content: message.content,
    attachments:
      message.attachments?.map((m) => ({
        id: m.id,
        name: m.name,
        url: m.url,
        mime: m.mime,
      })) || [],
    createdAt: message.createdAt,
  }));
};

export const listGroupConversations = async (userId: string) => {
  logger.info("[server][chat][service] listGroupConversations start", {
    userId,
  });

  const groups = await groupRepository
    .createQueryBuilder("group")
    .leftJoinAndSelect("group.chat", "chat") // all messages
    .leftJoinAndSelect("chat.sender", "sender") // message sender
    .leftJoinAndSelect("group.teamLeader", "teamLeader")
    .leftJoinAndSelect("group.technicians", "tg")
    .leftJoinAndSelect("tg.user", "technician")
    .where("teamLeader.id = :userId OR technician.id = :userId", { userId })
    .getMany();

  const conversations = groups.map((group) => {
    // Sort messages by createdAt descending
    const sortedMessages = group.chat?.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const lastMessage = sortedMessages?.[0];

    // Count unread messages where sender is not the current user
    const unreadCount =
      sortedMessages?.filter((msg) => msg.sender.id !== userId && !msg.isRead)
        .length ?? 0;

    return {
      groupId: group.id,
      name: group.name ?? { en: "", ar: "" },
      lastMessage: lastMessage?.content ?? "",
      lastMessageAt: lastMessage?.createdAt ?? null,
      unreadCount,
    };
  });

  logger.info("[server][chat][service] listGroupConversations completed", {
    userId,
    count: conversations.length,
  });

  return conversations;
};

export const getCombinedChatInbox = async (userId: string) => {
  logger.info("[server][chat][service] getCombinedChatInbox start", {
    userId,
  });

  const personalConversations = await listPersonalConversations(userId);

  // Map to combined DTO
  const personalMapped = personalConversations.map((conv) => ({
    type: "personal",
    id: conv.userId,
    name: conv.name,
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: conv.unreadCount,
  }));

  const groupConversations = await listGroupConversations(userId);

  // Flatten name object to string for inbox
  const groupMapped = groupConversations.map((conv) => ({
    type: "group",
    id: conv.groupId,
    name: conv.name?.en ?? "",
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: conv.unreadCount,
  }));

  const combined = [...personalMapped, ...groupMapped].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  logger.info("[server][chat][service] getCombinedChatInbox completed", {
    userId,
    count: combined.length,
  });

  return combined;
};
