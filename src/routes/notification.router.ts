import { Router } from "express";
import {
  broadcastNotificationController,
  deleteNotificationsController,
  getNotificationByIdController,
  getNotificationsController,
  getUnreadCountController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
  getBootstrapInboxController,
} from "../controllers/notifications.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

/**
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     summary: List notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               title: "New Ticket Assigned"
 *               body: "Ticket #42 has been assigned to you."
 *               read: false
 *               createdAt: "2026-05-29T10:00:00.000Z"
 *
 *   delete:
 *     summary: Delete notifications
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ids
 *         schema: { type: string }
 *         description: Comma-separated list of notification IDs
 *     responses:
 *       200:
 *         description: Notifications deleted
 */
router.get("/", getNotificationsController);
router.delete("/", deleteNotificationsController);

/**
 * @openapi
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           count: 7
 */
router.get("/unread-count", getUnreadCountController);

/**
 * @openapi
 * /api/v1/notifications/bootstrap/inbox:
 *   get:
 *     summary: Bootstrap inbox payload
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Inbox state bootstrapped
 */
router.get("/bootstrap/inbox", getBootstrapInboxController);

/**
 * @openapi
 * /api/v1/notifications/broadcast:
 *   post:
 *     summary: Broadcast notification
 *     description: Send a notification to all users (Admin only)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, body]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "System Maintenance Notice"
 *               body:
 *                 type: string
 *                 example: "The system will be down for maintenance from 2 AM to 4 AM."
 *     responses:
 *       201:
 *         description: Broadcast sent
 */
router.post("/broadcast", broadcastNotificationController);

/**
 * @openapi
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 *         example:
 *           updatedCount: 15
 */
router.patch("/read-all", markAllNotificationsAsReadController);

/**
 * @openapi
 * /api/v1/notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           id: 1
 *           title: "New Ticket Assigned"
 *           body: "Ticket #42 has been assigned to you."
 *           read: false
 *           createdAt: "2026-05-29T10:00:00.000Z"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 */
router.get("/:id", getNotificationByIdController);

/**
 * @openapi
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch("/:id/read", markNotificationAsReadController);

export default router;
