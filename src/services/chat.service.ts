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
import { Team } from "../entities/Team.js";
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
const teamRepository = PostgresDataSource.getRepository(Team);

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
  teamId: message.team?.id ?? null,
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
    .leftJoin("group.heads", "groupHead")
    .leftJoin("groupHead.user", "headUser")
    .leftJoin("group.technicians", "tg")
    .leftJoin("tg.user", "technician")
    .leftJoin("group.teams", "team")
    .leftJoin("team.leads", "teamLead")
    .leftJoin("teamLead.user", "teamLeadUser")
    .leftJoin("team.technicians", "teamTechnician")
    .leftJoin("teamTechnician.user", "teamTechnicianUser")
    .where("group.id = :groupId", { groupId })
    .andWhere(
      `(
        headUser.id = :userId
        OR technician.id = :userId
        OR teamLeadUser.id = :userId
        OR teamTechnicianUser.id = :userId
      )`,
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

const ensureTeamChatAccess = async (
  userId: string,
  teamId: string,
  t: any,
) => {
  const membershipCount = await teamRepository
    .createQueryBuilder("team")
    .leftJoin("team.group", "group")
    .leftJoin("group.heads", "groupHead")
    .leftJoin("groupHead.user", "headUser")
    .leftJoin("team.leads", "teamLead")
    .leftJoin("teamLead.user", "teamLeadUser")
    .leftJoin("team.technicians", "teamTechnician")
    .leftJoin("teamTechnician.user", "teamTechnicianUser")
    .where("team.id = :teamId", { teamId })
    .andWhere(
      `(
        headUser.id = :userId
        OR teamLeadUser.id = :userId
        OR teamTechnicianUser.id = :userId
      )`,
      { userId },
    )
    .getCount();

  if (!membershipCount) {
    throw new AppError(
      t("auth.permissions_error") || "You do not have access to this team chat.",
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
    WITH last_messages AS (
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
    ),
    unread_counts AS (
      SELECT
        m."senderId" AS "otherUserId",
        COUNT(m.id)::int AS "unreadCount"
      FROM chat_messages m
      WHERE m."recipientId" = $1
        AND m."isRead" = false
      GROUP BY m."senderId"
    )
    SELECT 
      lm.*,
      COALESCE(uc."unreadCount", 0) AS "unreadCount"
    FROM last_messages lm
    LEFT JOIN unread_counts uc ON uc."otherUserId" = lm."otherUserId"
    `,
    [currentUserId],
  );

  const conversations = await Promise.all(
    lastMessages.map(async (msg: any) => {
      const otherUserId = msg.otherUserId;
      if (!otherUserId || otherUserId === currentUserId) {
        return null;
      }

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
        unreadCount: msg.unreadCount,
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
    .leftJoinAndSelect("group.heads", "groupHead")
    .leftJoinAndSelect("groupHead.user", "headUser")
    .leftJoinAndSelect("group.technicians", "tg")
    .leftJoinAndSelect("tg.user", "technician")
    .leftJoinAndSelect("group.teams", "team")
    .leftJoinAndSelect("team.leads", "teamLead")
    .leftJoinAndSelect("teamLead.user", "teamLeadUser")
    .leftJoinAndSelect("team.technicians", "teamTechnician")
    .leftJoinAndSelect("teamTechnician.user", "teamTechnicianUser")
    .where("group.id = :groupId", { groupId: group.id })
    .getOne();

  const userIds = Array.from(
    new Set(
      [
        ...(groupWithMembers?.heads || []).map((head: any) => head.user?.id),
        ...(groupWithMembers?.technicians || []).map(
          (member: any) => member.user?.id,
        ),
        ...(groupWithMembers?.teams || []).flatMap((team: any) => [
          ...(team.leads || []).map((lead: any) => lead.user?.id),
          ...(team.technicians || []).map((member: any) => member.user?.id),
        ]),
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
  logger.info("[server][chat][service] listGroupConversations start", { userId });

  const tStart = performance.now();

  // ── Single CTE query ─────────────────────────────────────────────────────
  // BEFORE: getMany() hydrated ALL chat history + member relations (9 joins),
  //         then N×getCount() for unread (one query per group).
  //         Cost: 188-202ms for only 15 message rows (8-13x SQL cost).
  //
  // AFTER:  One parameterized query.
  //   - user_groups  : resolves membership via 4 UNION paths (no entity load)
  //   - last_messages: DISTINCT ON gets latest message per group in-DB
  //   - unread_counts: aggregated LEFT JOIN anti-join, one row per group
  // Zero entity objects allocated; zero N+1 queries.
  const tQueryStart = performance.now();
  const rows = await chatRepository.query(
    `
    WITH user_groups AS (
      SELECT "groupId" FROM group_heads
        WHERE "userId" = $1 AND "deletedAt" IS NULL
      UNION
      SELECT "groupId" FROM technician_groups
        WHERE "userId" = $1 AND "deletedAt" IS NULL
      UNION
      SELECT t."groupId"
      FROM team_leads tl
      INNER JOIN teams t ON t.id = tl."teamId" AND t."deletedAt" IS NULL
      WHERE tl."userId" = $1 AND tl."deletedAt" IS NULL
      UNION
      SELECT t."groupId"
      FROM team_technicians tt
      INNER JOIN teams t ON t.id = tt."teamId" AND t."deletedAt" IS NULL
      WHERE tt."userId" = $1 AND tt."deletedAt" IS NULL
    ),
    last_messages AS (
      SELECT DISTINCT ON (m."groupId")
        m."groupId",
        m.content,
        m."createdAt"
      FROM chat_messages m
      WHERE m."groupId" IN (SELECT "groupId" FROM user_groups)
      ORDER BY m."groupId", m."createdAt" DESC
    ),
    unread_counts AS (
      SELECT
        m."groupId",
        COUNT(m.id)::int AS "unreadCount"
      FROM chat_messages m
      LEFT JOIN chat_message_reads r
        ON r."messageId" = m.id AND r."userId" = $1
      WHERE m."groupId" IN (SELECT "groupId" FROM user_groups)
        AND m."senderId" != $1
        AND r.id IS NULL
      GROUP BY m."groupId"
    )
    SELECT
      g.id                                         AS "groupId",
      COALESCE(g.name->>'en', g.name->>'ar', '')   AS "name_en",
      COALESCE(g.name->>'ar', g.name->>'en', '')   AS "name_ar",
      COALESCE(lm.content, '')                     AS "lastMessage",
      lm."createdAt"                               AS "lastMessageAt",
      COALESCE(uc."unreadCount", 0)                AS "unreadCount"
    FROM user_groups ug
    INNER JOIN groups g ON g.id = ug."groupId" AND g."deletedAt" IS NULL
    LEFT JOIN last_messages lm ON lm."groupId" = g.id
    LEFT JOIN unread_counts uc ON uc."groupId" = g.id
    `,
    [userId],
  ) as Array<{
    groupId: string;
    name_en: string | null;
    name_ar: string | null;
    lastMessage: string;
    lastMessageAt: Date | null;
    unreadCount: number | string;
  }>;

  const tQueryEnd = performance.now();
  const queryMs = tQueryEnd - tQueryStart;

  if (queryMs > 50) {
    console.warn(
      `[POOL WARNING] listGroupConversations: query took ${queryMs.toFixed(2)}ms ` +
      `(threshold 50ms). Possible pool contention or slow query. userId=${userId}`,
    );
  }

  const result = rows.map((row) => ({
    groupId: row.groupId,
    name: row.name_en ?? row.name_ar ?? "",
    name_en: row.name_en ?? row.name_ar ?? "",
    name_ar: row.name_ar ?? row.name_en ?? "",
    lastMessage: row.lastMessage ?? "",
    lastMessageAt: row.lastMessageAt ?? null,
    unreadCount:
      typeof row.unreadCount === "string"
        ? parseInt(row.unreadCount, 10) || 0
        : (row.unreadCount ?? 0),
  }));

  logger.info("[server][chat][service] listGroupConversations completed", {
    userId,
    groupCount: result.length,
    poolAndSqlMs: queryMs.toFixed(2),
    totalMs: (performance.now() - tStart).toFixed(2),
  });

  return result;
};

export const sendTeamMessage = async (
  senderId: string,
  teamId: string,
  content: string,
  files: Express.Multer.File[],
  t: any,
) => {
  const sender = ensureStaffChatUser(
    await usersRepository.findOne({
      where: { id: senderId, deletedAt: null },
    }),
    t,
  );

  const team = await teamRepository.findOne({
    where: { id: teamId },
    relations: ["group"],
  });

  if (!team) {
    throw new AppError(t("team_not_found"), 404);
  }

  await ensureTeamChatAccess(senderId, teamId, t);

  const message = chatRepository.create({
    sender,
    team,
    content,
    attachments: [],
  });

  await chatRepository.save(message);

  if (files?.length) {
    const mediaEntities: Media[] = [];

    for (const file of files) {
      const key = `chat/teams/${teamId}/${message.id}/${uuid()}-${file.originalname}`;

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

  const teamWithMembers = await teamRepository
    .createQueryBuilder("team")
    .leftJoinAndSelect("team.group", "group")
    .leftJoinAndSelect("group.heads", "groupHead")
    .leftJoinAndSelect("groupHead.user", "headUser")
    .leftJoinAndSelect("team.leads", "teamLead")
    .leftJoinAndSelect("teamLead.user", "teamLeadUser")
    .leftJoinAndSelect("team.technicians", "teamTechnician")
    .leftJoinAndSelect("teamTechnician.user", "teamTechnicianUser")
    .where("team.id = :teamId", { teamId })
    .getOne();

  const userIds = Array.from(
    new Set(
      [
        ...(teamWithMembers?.group?.heads || []).map((head: any) => head.user?.id),
        ...(teamWithMembers?.leads || []).map((lead: any) => lead.user?.id),
        ...(teamWithMembers?.technicians || []).map(
          (member: any) => member.user?.id,
        ),
      ].filter((memberId): memberId is string => Boolean(memberId)),
    ),
  ).filter((memberId) => memberId !== sender.id);

  if (userIds.length > 0) {
    await createNotification(
      NotificationType.MESSAGE,
      `New message in team ${team.name?.en || ""}`,
      content,
      userIds,
      { chatMessageId: message.id },
    );
  }

  const fullMessage = await chatRepository.findOne({
    where: { id: message.id },
    relations: ["sender", "team", "attachments"],
  });
  const response = await mapChatMessageResponse((fullMessage ?? message) as ChatMessage);

  for (const userId of [...userIds, sender.id]) {
    notificationUser("chat:message", {
      userId,
      conversationType: "team",
      conversationId: team.id,
      message: response,
    });
  }

  return response;
};

export const getTeamMessages = async (
  currentUserId: string,
  teamId: string,
  t: any,
) => {
  await ensureTeamChatAccess(currentUserId, teamId, t);

  const team = await teamRepository.findOne({
    where: { id: teamId },
  });

  if (!team) {
    throw new AppError("team_not_found", 404);
  }

  const messages = await chatRepository
    .createQueryBuilder("message")
    .leftJoinAndSelect("message.sender", "sender")
    .leftJoinAndSelect("message.team", "team")
    .leftJoinAndSelect("message.attachments", "attachments")
    .where("team.id = :teamId", { teamId })
    .orderBy("message.createdAt", "ASC")
    .getMany();

  await markGroupMessagesAsRead(currentUserId, messages);

  return Promise.all(messages.map((message) => mapChatMessageResponse(message)));
};

export const listTeamConversations = async (userId: string) => {
  const tStart = performance.now();

  // ── Single CTE query ─────────────────────────────────────────────────────
  // BEFORE: getMany() hydrated ALL team chat history + 6 member-relation joins,
  //         then N×getCount() for unread. Same hydration anti-pattern as groups.
  //
  // AFTER:  One parameterized query.
  //   - user_teams   : membership via 3 UNION paths (group heads own all teams)
  //   - last_messages: DISTINCT ON latest message per team, in-DB
  //   - unread_counts: aggregated LEFT JOIN anti-join, one row per team
  const tQueryStart = performance.now();
  const rows = await teamRepository.query(
    `
    WITH user_teams AS (
      SELECT t.id AS "teamId"
      FROM group_heads gh
      INNER JOIN teams t ON t."groupId" = gh."groupId" AND t."deletedAt" IS NULL
      WHERE gh."userId" = $1 AND gh."deletedAt" IS NULL
      UNION
      SELECT "teamId" FROM team_leads
        WHERE "userId" = $1 AND "deletedAt" IS NULL
      UNION
      SELECT "teamId" FROM team_technicians
        WHERE "userId" = $1 AND "deletedAt" IS NULL
    ),
    last_messages AS (
      SELECT DISTINCT ON (m."teamId")
        m."teamId",
        m.content,
        m."createdAt"
      FROM chat_messages m
      WHERE m."teamId" IN (SELECT "teamId" FROM user_teams)
      ORDER BY m."teamId", m."createdAt" DESC
    ),
    unread_counts AS (
      SELECT
        m."teamId",
        COUNT(m.id)::int AS "unreadCount"
      FROM chat_messages m
      LEFT JOIN chat_message_reads r
        ON r."messageId" = m.id AND r."userId" = $1
      WHERE m."teamId" IN (SELECT "teamId" FROM user_teams)
        AND m."senderId" != $1
        AND r.id IS NULL
      GROUP BY m."teamId"
    )
    SELECT
      t.id                                         AS "teamId",
      COALESCE(t.name->>'en', t.name->>'ar', '')   AS "name_en",
      COALESCE(t.name->>'ar', t.name->>'en', '')   AS "name_ar",
      COALESCE(lm.content, '')                     AS "lastMessage",
      lm."createdAt"                               AS "lastMessageAt",
      COALESCE(uc."unreadCount", 0)                AS "unreadCount"
    FROM user_teams ut
    INNER JOIN teams t ON t.id = ut."teamId" AND t."deletedAt" IS NULL
    LEFT JOIN last_messages lm ON lm."teamId" = t.id
    LEFT JOIN unread_counts uc ON uc."teamId" = t.id
    `,
    [userId],
  ) as Array<{
    teamId: string;
    name_en: string | null;
    name_ar: string | null;
    lastMessage: string;
    lastMessageAt: Date | null;
    unreadCount: number | string;
  }>;

  const tQueryEnd = performance.now();
  const queryMs = tQueryEnd - tQueryStart;

  if (queryMs > 50) {
    console.warn(
      `[POOL WARNING] listTeamConversations: query took ${queryMs.toFixed(2)}ms ` +
      `(threshold 50ms). Possible pool contention or slow query. userId=${userId}`,
    );
  }

  const result = rows.map((row) => ({
    teamId: row.teamId,
    name: row.name_en ?? row.name_ar ?? "",
    name_en: row.name_en ?? row.name_ar ?? "",
    name_ar: row.name_ar ?? row.name_en ?? "",
    lastMessage: row.lastMessage ?? "",
    lastMessageAt: row.lastMessageAt ?? null,
    unreadCount:
      typeof row.unreadCount === "string"
        ? parseInt(row.unreadCount, 10) || 0
        : (row.unreadCount ?? 0),
  }));

  logger.info("[server][chat][service] listTeamConversations completed", {
    userId,
    teamCount: result.length,
    poolAndSqlMs: queryMs.toFixed(2),
    totalMs: (performance.now() - tStart).toFixed(2),
  });

  return result;
};

export const getCombinedChatInbox = async (userId: string) => {
  logger.info("[server][chat][service] getCombinedChatInbox start", { userId });

  const tStart = performance.now();

  // ── Run all three inbox queries concurrently ──────────────────────────────
  // BEFORE: sequential awaits → total time = personal + groups + teams
  // AFTER:  Promise.all → total time = max(personal, groups, teams)
  const [personalConversations, groupConversations, teamConversations] = await Promise.all([
    listPersonalConversations(userId),
    listGroupConversations(userId),
    listTeamConversations(userId),
  ]);

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

  const teamMapped = teamConversations.map((conv) => ({
    type: "team",
    id: conv.teamId,
    name: conv.name_en ?? conv.name_ar ?? "",
    name_en: conv.name_en ?? conv.name_ar ?? "",
    name_ar: conv.name_ar ?? conv.name_en ?? "",
    image: null,
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt,
    unreadCount: conv.unreadCount,
  }));

  const combined = [...personalMapped, ...groupMapped, ...teamMapped].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  logger.info("[server][chat][service] getCombinedChatInbox completed", {
    userId,
    count: combined.length,
    totalMs: (performance.now() - tStart).toFixed(2),
  });

  return combined;
};
