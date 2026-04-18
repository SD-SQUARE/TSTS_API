import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { ChatMessage } from "../entities/ChatMessage.js";
import { ChatMessageRead } from "../entities/ChatMessageRead.js";
import { User } from "../entities/User.js";
import { Media } from "../entities/Media.js";
import { v4 as uuid } from "uuid";
import { getPresignedUrl, uploadFile } from "../utils/storage.js";
import { Group } from "../entities/Group.js";
import { createNotification } from "./notification.service.js";
import { NotificationType } from "../enums/NotificationType.enum.js";
import { getFullNameByLang } from "../helpers/UserPersonalData.helper.js";
import { notificationUser } from "./socket.service.js";
import { UserType } from "../enums/UserType.enum.js";

const chatRepository = PostgresDataSource.getRepository(ChatMessage);
const chatMessageReadRepository = PostgresDataSource.getRepository(ChatMessageRead);
const usersRepository = PostgresDataSource.getRepository(User);
const mediaRepository = PostgresDataSource.getRepository(Media);
const groupRepository = PostgresDataSource.getRepository(Group);

const mapChatAttachment = async (item: Media) => ({
  id: item.id,
  name: item.name,
  url: await getPresignedUrl(process.env.MINIO_BUCKET!, item.url, 3600),
  mime: item.mime,
});

const mapChatUser = async (user?: User | null) => {
  const nameEn = user ? getFullNameByLang(user, "en") || user.email : "";
  const nameAr = user ? getFullNameByLang(user, "ar") || user.email : "";

  return {
    id: user?.id ?? "",
    name: nameEn || nameAr,
    name_en: nameEn || nameAr,
    name_ar: nameAr || nameEn,
    image:
      user?.image
        ? await getPresignedUrl(process.env.MINIO_BUCKET!, user.image, 3600)
        : null,
  };
};

const mapChatMessageResponse = async (message: ChatMessage) => ({
  id: message.id,
  senderId: message.sender?.id ?? null,
  recipientId: message.recipient?.id ?? null,
  groupId: message.group?.id ?? null,
  content: message.content,
  sender: await mapChatUser(message.sender),
  attachments: await Promise.all((message.attachments || []).map(mapChatAttachment)),
  createdAt: message.createdAt,
});

const buildPresignedImage = async (image?: string | null) =>
  image ? getPresignedUrl(process.env.MINIO_BUCKET!, image, 3600) : null;

const ensureStaffChatUser = (user: User | null, t: any) => {
  if (!user) {
    throw new AppError(t("user_not_found"), 404);
  }

  if (user.user_type === UserType.REQUESTER) {
    throw new AppError(
      t("auth.permissions_error") || "Chat is only available for staff users.",
      403,
    );
  }

  return user;
};

const ensureGroupChatAccess = async (
  userId: string,
  groupId: string,
  t: any,
) => {
  const membershipCount = await groupRepository
    .createQueryBuilder("group")
    .leftJoin("group.teamLeader", "teamLeader")
    .leftJoin("group.heads", "groupHead")
    .leftJoin("groupHead.user", "headUser")
    .leftJoin("group.technicians", "tg")
    .leftJoin("tg.user", "technician")
    .where("group.id = :groupId", { groupId })
    .andWhere(
      "(teamLeader.id = :userId OR headUser.id = :userId OR technician.id = :userId)",
      {
        userId,
      },
    )
    .getCount();

  if (!membershipCount) {
    throw new AppError(
      t("auth.permissions_error") || "You do not have access to this group chat.",
      403,
    );
  }
};

const markGroupMessagesAsRead = async (
  userId: string,
  messages: ChatMessage[],
) => {
  const unreadMessageIds = messages
    .filter((message) => message.sender?.id !== userId)
    .map((message) => message.id);

  if (!unreadMessageIds.length) {
    return;
  }

  const existingRows = await chatMessageReadRepository
    .createQueryBuilder("read")
    .select('read."messageId"', "messageId")
    .where('read."userId" = :userId', { userId })
    .andWhere('read."messageId" IN (:...messageIds)', {
      messageIds: unreadMessageIds,
    })
    .getRawMany<{ messageId: string }>();

  const existingIds = new Set(existingRows.map((item) => item.messageId));
  const missingReads = unreadMessageIds
    .filter((messageId) => !existingIds.has(messageId))
    .map((messageId) =>
      chatMessageReadRepository.create({
        message: { id: messageId } as ChatMessage,
        user: { id: userId } as User,
      }),
    );

  if (missingReads.length) {
    await chatMessageReadRepository.save(missingReads);
  }
};

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

  const sender = ensureStaffChatUser(
    await usersRepository.findOne({
      where: { id: senderId, deletedAt: null },
    }),
    t,
  );

  const recipient = ensureStaffChatUser(
    await usersRepository.findOne({
      where: { id: recipientId, deletedAt: null },
    }),
    t,
  );

  if (sender.id === recipient.id) {
    throw new AppError(
      t("auth.permissions_error") || "You cannot open a chat with yourself.",
      400,
    );
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

  const fullMessage = await chatRepository.findOne({
    where: { id: message.id },
    relations: ["sender", "recipient", "attachments"],
  });

  const response = await mapChatMessageResponse((fullMessage ?? message) as ChatMessage);

  notificationUser("chat:message", {
    userId: recipient.id,
    conversationType: "personal",
    conversationId: sender.id,
    message: response,
  });
  notificationUser("chat:message", {
    userId: sender.id,
    conversationType: "personal",
    conversationId: recipient.id,
    message: response,
  });

  return response;
};

export const getPersonalMessages = async (
  currentUserId: string,
  otherUserId: string,
) => {
  logger.info("[server][chat][service] getPersonalMessages start", {
    currentUserId,
    otherUserId,
  });

  if (currentUserId === otherUserId) {
    throw new AppError("user_not_found", 404);
  }

  const otherUser = await usersRepository.findOne({
    where: { id: otherUserId, deletedAt: null },
  });

  if (!otherUser) {
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

  return Promise.all(messages.map((message) => mapChatMessageResponse(message)));
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
        WHEN m."senderId" = $1 THEN u.id
        ELSE s.id
      END as "otherUserId",
      CASE
        WHEN m."senderId" = $1 THEN u.email
        ELSE s.email
      END as "otherUserEmail",
      CASE
        WHEN m."senderId" = $1 THEN u.image
        ELSE s.image
      END as "otherUserImage",
      CASE 
        WHEN m."senderId" = $1 THEN COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ',
            NULLIF(COALESCE(u."firstName"->>'en', ''), ''),
            NULLIF(COALESCE(u."midName"->>'en', ''), ''),
            NULLIF(COALESCE(u."lastName"->>'en', ''), '')
          )), ''),
          u.email
        )
        ELSE COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ',
            NULLIF(COALESCE(s."firstName"->>'en', ''), ''),
            NULLIF(COALESCE(s."midName"->>'en', ''), ''),
            NULLIF(COALESCE(s."lastName"->>'en', ''), '')
          )), ''),
          s.email
        )
      END as "otherUserNameEn",
      CASE 
        WHEN m."senderId" = $1 THEN COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ',
            NULLIF(COALESCE(u."firstName"->>'ar', ''), ''),
            NULLIF(COALESCE(u."midName"->>'ar', ''), ''),
            NULLIF(COALESCE(u."lastName"->>'ar', ''), '')
          )), ''),
          u.email
        )
        ELSE COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ',
            NULLIF(COALESCE(s."firstName"->>'ar', ''), ''),
            NULLIF(COALESCE(s."midName"->>'ar', ''), ''),
            NULLIF(COALESCE(s."lastName"->>'ar', ''), '')
          )), ''),
          s.email
        )
      END as "otherUserNameAr"
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
      const otherUserId = msg.otherUserId;
      if (!otherUserId || otherUserId === currentUserId) {
        return null;
      }

      const unreadCount = await chatRepository.count({
        where: {
          recipient: { id: currentUserId },
          sender: { id: otherUserId },
          isRead: false,
        },
      });

      return {
        userId: otherUserId,
        name:
          msg.otherUserNameEn ??
          msg.otherUserNameAr ??
          msg.otherUserEmail ??
          "",
        name_en:
          msg.otherUserNameEn ??
          msg.otherUserNameAr ??
          msg.otherUserEmail ??
          "",
        name_ar:
          msg.otherUserNameAr ??
          msg.otherUserNameEn ??
          msg.otherUserEmail ??
          "",
        image: await buildPresignedImage(msg.otherUserImage),
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt,
        unreadCount,
      };
    }),
  );

  return conversations.filter(Boolean);
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

  const sender = ensureStaffChatUser(
    await usersRepository.findOne({
      where: { id: senderId, deletedAt: null },
    }),
    t,
  );

  const group = await groupRepository.findOne({
    where: { id: groupId },
  });

  if (!group) {
    throw new AppError(t("group_not_found"), 404);
  }

  await ensureGroupChatAccess(senderId, groupId, t);

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

  const groupWithMembers = await groupRepository
    .createQueryBuilder("group")
    .leftJoinAndSelect("group.teamLeader", "teamLeader")
    .leftJoinAndSelect("group.heads", "groupHead")
    .leftJoinAndSelect("groupHead.user", "headUser")
    .leftJoinAndSelect("group.technicians", "tg")
    .leftJoinAndSelect("tg.user", "technician")
    .where("group.id = :groupId", { groupId: group.id })
    .getOne();

  const userIds = Array.from(
    new Set(
      [
        groupWithMembers?.teamLeader?.id,
        ...(groupWithMembers?.heads || []).map((head: any) => head.user?.id),
        ...(groupWithMembers?.technicians || []).map(
          (member: any) => member.user?.id,
        ),
      ].filter((memberId): memberId is string => Boolean(memberId)),
    ),
  ).filter((memberId) => memberId !== sender.id);

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

  const fullMessage = await chatRepository.findOne({
    where: { id: message.id },
    relations: ["sender", "group", "attachments"],
  });
  const response = await mapChatMessageResponse((fullMessage ?? message) as ChatMessage);

  for (const userId of [...userIds, sender.id]) {
    notificationUser("chat:message", {
      userId,
      conversationType: "group",
      conversationId: group.id,
      message: response,
    });
  }

  return response;
};

export const getGroupMessages = async (
  currentUserId: string,
  groupId: string,
  t: any,
) => {
  logger.info("[server][chat][service] getGroupMessages start", {
    currentUserId,
    groupId,
  });

  await ensureGroupChatAccess(currentUserId, groupId, t);

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

  await markGroupMessagesAsRead(currentUserId, messages);

  return Promise.all(messages.map((message) => mapChatMessageResponse(message)));
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
    .leftJoinAndSelect("group.heads", "groupHead")
    .leftJoinAndSelect("groupHead.user", "headUser")
    .leftJoinAndSelect("group.technicians", "tg")
    .leftJoinAndSelect("tg.user", "technician")
    .where(
      "teamLeader.id = :userId OR headUser.id = :userId OR technician.id = :userId",
      { userId },
    )
    .distinct(true)
    .getMany();

  const conversations = groups.map((group) => {
    // Sort messages by createdAt descending
    const sortedMessages = group.chat?.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    const lastMessage = sortedMessages?.[0];

    // Count unread messages where sender is not the current user
    return {
      groupId: group.id,
      name: group.name?.en ?? group.name?.ar ?? "",
      name_en: group.name?.en ?? group.name?.ar ?? "",
      name_ar: group.name?.ar ?? group.name?.en ?? "",
      lastMessage: lastMessage?.content ?? "",
      lastMessageAt: lastMessage?.createdAt ?? null,
      unreadCount: 0,
    };
  });

  const conversationsWithUnread = await Promise.all(
    conversations.map(async (conversation) => {
      const unreadCount = await chatRepository
        .createQueryBuilder("message")
        .leftJoin("message.sender", "sender")
        .leftJoin(
          ChatMessageRead,
          "read",
          'read."messageId" = message.id AND read."userId" = :userId',
          { userId },
        )
        .where('message."groupId" = :groupId', {
          groupId: conversation.groupId,
        })
        .andWhere("sender.id != :userId", { userId })
        .andWhere("read.id IS NULL")
        .getCount();

      return {
        ...conversation,
        unreadCount,
      };
    }),
  );

  logger.info("[server][chat][service] listGroupConversations completed", {
    userId,
    count: conversationsWithUnread.length,
  });

  return conversationsWithUnread;
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
    name_en: conv.name_en ?? conv.name_ar ?? conv.name,
    name_ar: conv.name_ar ?? conv.name_en ?? conv.name,
    image: conv.image ?? null,
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: conv.unreadCount,
  }));

  const groupConversations = await listGroupConversations(userId);

  // Flatten name object to string for inbox
  const groupMapped = groupConversations.map((conv) => ({
    type: "group",
    id: conv.groupId,
    name: conv.name_en ?? conv.name_ar ?? "",
    name_en: conv.name_en ?? conv.name_ar ?? "",
    name_ar: conv.name_ar ?? conv.name_en ?? "",
    image: null,
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
