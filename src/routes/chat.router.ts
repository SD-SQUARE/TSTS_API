import { Router } from "express";
import {
  sendPersonalMessageController,
  getPersonalMessagesController,
  getPersonalConversations,
  sendGroupMessageController,
  getGroupMessagesController,
  listGroupConversationsController,
  getCombinedChatInboxController,
  getUnreadPersonalMessagesCount,
  sendTeamMessageController,
  getTeamMessagesController,
  listTeamConversationsController,
} from "../controllers/chat.controller.js";
import { upload } from "../middleware/upload.js";
import { authMiddleware } from "../middleware/auth.js";
import { typeBasedAuthMiddleware } from "../middleware/typeBasedAuthMiddleware.js";
import { UserType } from "../enums/UserType.enum.js";

const router = Router();

router.use(authMiddleware);
router.use(typeBasedAuthMiddleware([UserType.ADMIN, UserType.TECHNICIAN, UserType.SUPER_ADMIN]));

/**
 * @openapi
 * /api/v1/chat/personal/{userId}/messages:
 *   post:
 *     summary: Send personal message
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Hello, I wanted to check on your ticket status."
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Message sent
 *
 *   get:
 *     summary: Get personal messages
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               message: "Hello!"
 *               senderId: 5
 *               createdAt: "2026-05-29T10:00:00.000Z"
 */
router.post("/personal/:userId/messages", upload.array("attachments"), sendPersonalMessageController);
router.get("/personal/:userId/messages", getPersonalMessagesController);

/**
 * @openapi
 * /api/v1/chat/personal/conversations:
 *   get:
 *     summary: List personal conversations
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - otherUserId: 10
 *               otherUserName: "Jane Smith"
 *               lastMessage: "Thanks for the update"
 *               unreadCount: 2
 *               lastMessageAt: "2026-05-29T12:00:00.000Z"
 */
router.get("/personal/conversations", getPersonalConversations);

/**
 * @openapi
 * /api/v1/chat/personal/unread-count:
 *   get:
 *     summary: Get unread personal message count
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           count: 5
 */
router.get("/personal/unread-count", getUnreadPersonalMessagesCount);

/**
 * @openapi
 * /api/v1/chat/group/{groupId}/messages:
 *   post:
 *     summary: Send group message
 *     tags: [Chat, Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "The ticket has been assigned to our team."
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Message sent
 *
 *   get:
 *     summary: Get group messages
 *     tags: [Chat, Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               message: "Hello team!"
 *               senderName: "John Doe"
 *               createdAt: "2026-05-29T10:00:00.000Z"
 */
router.post("/group/:groupId/messages", upload.array("attachments"), sendGroupMessageController);
router.get("/group/:groupId/messages", getGroupMessagesController);

/**
 * @openapi
 * /api/v1/chat/group/conversations:
 *   get:
 *     summary: List group conversations
 *     tags: [Chat, Groups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - groupId: 1
 *               groupName: "Network Support"
 *               lastMessage: "Working on the issue"
 *               unreadCount: 3
 */
router.get("/group/conversations", listGroupConversationsController);

/**
 * @openapi
 * /api/v1/chat/team/{teamId}/messages:
 *   post:
 *     summary: Send team message
 *     tags: [Chat, Teams]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Team standup in 10 minutes."
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Message sent
 *
 *   get:
 *     summary: Get team messages
 *     tags: [Chat, Teams]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               message: "Team standup in 10 minutes."
 *               senderName: "John Doe"
 *               createdAt: "2026-05-29T10:00:00.000Z"
 */
router.post("/team/:teamId/messages", upload.array("attachments"), sendTeamMessageController);
router.get("/team/:teamId/messages", getTeamMessagesController);

/**
 * @openapi
 * /api/v1/chat/team/conversations:
 *   get:
 *     summary: List team conversations
 *     tags: [Chat, Teams]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - teamId: 1
 *               teamName: "IT Support Team A"
 *               lastMessage: "Standup in 10"
 *               unreadCount: 1
 */
router.get("/team/conversations", listTeamConversationsController);

/**
 * @openapi
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get combined chat inbox
 *     description: Returns all personal, group, and team conversations in one list
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - type: "personal"
 *               id: "p_10"
 *               name: "Jane Smith"
 *               lastMessage: "Thanks!"
 *               unreadCount: 2
 *             - type: "group"
 *               id: "g_1"
 *               name: "Network Support"
 *               lastMessage: "Ticket assigned"
 *               unreadCount: 5
 */
router.get("/conversations", getCombinedChatInboxController);

export default router;
