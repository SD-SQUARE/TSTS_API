import { Router } from "express";
import {
  createTicketController,
  deleteTicketController,
  getAllTicketsController,
  getSingleTicketController,
  getTicketActivitiesController,
  editTicketForAdminsAndTechniciansController,
  editTicketForRequesterController,
  getAllTicketAssetsController,
  getSingleTicketAssetController,
  uploadTicketAssetController,
  deleteTicketAssetController,
  uploadTicketChatMediaController,
  sendChatMessageController,
  getChatMessagesForTicketController,
  getQuickMessagesController,
  createQuickMessageController,
  updateQuickMessageController,
  deleteQuickMessageController,
  createTicketReviewController,
  getTicketReviewsController,
  changeTicketStatusController,
  getTicketAnalyticsController,
} from "../controllers/tickets.controller.js";
import {
  getTicketFinalReportController,
  upsertTicketFinalReportController,
  uploadTicketFinalReportMediaController,
} from "../controllers/ticketFinalReport.controller.js";
import { validate } from "../validation/zod-middleware.js";
import { upload } from "../middleware/upload.js";
import {
  changeTicketStatusSchema,
  getTicketActivitiesSchema,
  getTicketsSchema,
} from "../validation/ticket.schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { typeBasedAuthMiddleware } from "../middleware/typeBasedAuthMiddleware.js";
import { UserType } from "../enums/UserType.enum.js";
import { editTicketForAdminAndTechniciansSchema } from "../validation/tickets/edit-for-admins-and-technicians.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { editTicketForRequesterSchema } from "../validation/tickets/edit-for-requester.js";
import { createMessageSchema } from "../validation/tickets/chat/send-chat-message.schema.js";
import { createTicketReviewSchema } from "../validation/tickets/review.schema.js";
import { createQuickMessageSchema } from "../validation/tickets/chat/create-quick-message.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/tickets:
 *   post:
 *     summary: Create a new ticket
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description, priority]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Cannot access email"
 *               description:
 *                 type: string
 *                 example: "I am unable to log into my university email account since this morning."
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Critical]
 *                 example: "High"
 *               departmentId:
 *                 type: integer
 *                 example: 3
 *               specializationId:
 *                 type: integer
 *                 example: 5
 *               media:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Attached files
 *     responses:
 *       201:
 *         description: Ticket created
 *         content:
 *           application/json:
 *             example:
 *               id: 42
 *               title: "Cannot access email"
 *               status: "Open"
 *               priority: "High"
 *               createdAt: "2026-05-29T10:00:00.000Z"
 *       400:
 *         $ref: "#/components/responses/ValidationError"
 *
 *   get:
 *     summary: List all tickets
 *     tags: [Tickets]
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
 *         name: status
 *         schema: { type: string, enum: [Open, InProgress, Resolved, Closed] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [Low, Medium, High, Critical] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in title and description
 *     responses:
 *       200:
 *         description: Paginated list of tickets
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 - id: 42
 *                   title: "Cannot access email"
 *                   status: "Open"
 *                   priority: "High"
 *                   assignee: "John Doe"
 *               page: 1
 *               limit: 20
 *               total: 150
 *               totalPages: 8
 */
router.post("/", authMiddleware, upload.array("media"), (req, res) =>
  createTicketController(req, res),
);
router.get(
  "/",
  authMiddleware,
  validate(getTicketsSchema),
  getAllTicketsController,
);

/**
 * @openapi
 * /api/v1/tickets/analytics:
 *   get:
 *     summary: Get ticket analytics
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Ticket analytics data
 *         content:
 *           application/json:
 *             example:
 *               totalTickets: 500
 *               openTickets: 45
 *               resolvedTickets: 400
 *               avgResolutionHours: 8.5
 *               byStatus:
 *                 Open: 45
 *                 InProgress: 55
 *                 Resolved: 250
 *                 Closed: 150
 */
router.get("/analytics", authMiddleware, asyncHandler(getTicketAnalyticsController));

/**
 * @openapi
 * /api/v1/tickets/quick-messages:
 *   get:
 *     summary: List quick messages
 *     tags: [Tickets, Quick Messages]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               text: "Please restart your device and try again."
 *               category: "Troubleshooting"
 *
 *   post:
 *     summary: Create a quick message
 *     tags: [Tickets, Quick Messages]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Please restart your device and try again."
 *               category:
 *                 type: string
 *                 example: "Troubleshooting"
 *     responses:
 *       201:
 *         description: Quick message created
 */
router
  .get("/quick-messages", authMiddleware, asyncHandler(getQuickMessagesController))
  .post(
    "/quick-messages",
    authMiddleware,
    validate(createQuickMessageSchema),
    asyncHandler(createQuickMessageController),
  );

/**
 * @openapi
 * /api/v1/tickets/quick-messages/{quickMessageId}:
 *   put:
 *     summary: Update quick message
 *     tags: [Tickets, Quick Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quickMessageId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 example: "Updated quick message text."
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Quick message updated
 *
 *   delete:
 *     summary: Delete quick message
 *     tags: [Tickets, Quick Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quickMessageId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Quick message deleted
 */
router
  .put(
    "/quick-messages/:quickMessageId",
    authMiddleware,
    validate(createQuickMessageSchema),
    asyncHandler(updateQuickMessageController),
  )
  .delete(
    "/quick-messages/:quickMessageId",
    authMiddleware,
    asyncHandler(deleteQuickMessageController),
  );

/**
 * @openapi
 * /api/v1/tickets/{id}:
 *   get:
 *     summary: Get a single ticket by ID
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 42
 *     responses:
 *       200:
 *         description: Ticket details
 *         content:
 *           application/json:
 *             example:
 *               id: 42
 *               title: "Cannot access email"
 *               description: "I am unable to log in..."
 *               status: "Open"
 *               priority: "High"
 *               requester:
 *                 id: 10
 *                 name: "Jane Smith"
 *               assignee:
 *                 id: 5
 *                 name: "John Doe"
 *               createdAt: "2026-05-29T10:00:00.000Z"
 *               updatedAt: "2026-05-29T11:30:00.000Z"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *
 *   put:
 *     summary: Edit ticket (Requester only)
 *     description: Requester can update their own ticket details
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated ticket title"
 *               description:
 *                 type: string
 *                 example: "Updated description"
 *     responses:
 *       200:
 *         description: Ticket updated
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 *
 *   delete:
 *     summary: Delete a ticket
 *     description: Soft-delete a ticket (Admin or SuperAdmin only)
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Ticket deleted
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 */
router.get("/:id", authMiddleware, getSingleTicketController);
router
  .put(
    "/:id",
    upload.none(),
    authMiddleware,
    typeBasedAuthMiddleware([UserType.REQUESTER]),
    validate(editTicketForRequesterSchema),
    asyncHandler(editTicketForRequesterController),
  );
router
  .delete(
    "/:id",
    authMiddleware,
    typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN]),
    deleteTicketController,
  );

/**
 * @openapi
 * /api/v1/tickets/{id}/co-ordinate:
 *   put:
 *     summary: Edit ticket (Admins and Technicians)
 *     description: Admin or Technician can update ticket assignment, priority, and other fields
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assigneeId:
 *                 type: integer
 *                 example: 5
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Critical]
 *               departmentId:
 *                 type: integer
 *               specializationId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Ticket updated
 *       403:
 *         $ref: "#/components/responses/ForbiddenError"
 */
router
  .put(
    "/:id/co-ordinate",
    upload.none(),
    authMiddleware,
    typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]),
    validate(editTicketForAdminAndTechniciansSchema),
    asyncHandler(editTicketForAdminsAndTechniciansController),
  );

/**
 * @openapi
 * /api/v1/tickets/{id}/change-status:
 *   patch:
 *     summary: Change ticket status
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Open, InProgress, Resolved, Closed]
 *                 example: "InProgress"
 *               comment:
 *                 type: string
 *                 example: "Working on the issue now"
 *     responses:
 *       200:
 *         description: Status changed
 *         content:
 *           application/json:
 *             example:
 *               id: 42
 *               status: "InProgress"
 */
router
  .patch(
    "/:id/change-status",
    authMiddleware,
    validate(changeTicketStatusSchema),
    asyncHandler(changeTicketStatusController),
  );

/**
 * @openapi
 * /api/v1/tickets/{id}/activities:
 *   get:
 *     summary: Get ticket activities
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               action: "StatusChange"
 *               detail: "Changed to InProgress"
 *               performedByName: "John Doe"
 *               createdAt: "2026-05-29T11:00:00.000Z"
 */
router.get(
  "/:id/activities",
  validate(getTicketActivitiesSchema),
  getTicketActivitiesController,
);

/**
 * @openapi
 * /api/v1/tickets/{id}/reviews:
 *   get:
 *     summary: Get ticket reviews
 *     tags: [Tickets]
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
 *           data:
 *             - id: 1
 *               rating: 5
 *               comment: "Excellent support!"
 *               reviewerName: "Jane Smith"
 *
 *   post:
 *     summary: Create a ticket review
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Excellent and fast support!"
 *     responses:
 *       201:
 *         description: Review created
 */
router
  .get("/:id/reviews", authMiddleware, getTicketReviewsController)
  .post(
    "/:id/reviews",
    authMiddleware,
    validate(createTicketReviewSchema),
    createTicketReviewController,
  );

/**
 * @openapi
 * /api/v1/tickets/{id}/media:
 *   get:
 *     summary: List ticket attachments
 *     tags: [Tickets]
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
 *           data:
 *             - id: 15
 *               filename: "screenshot.png"
 *               url: "https://storage.tsts.local/media/screenshot.png"
 *
 *   post:
 *     summary: Upload ticket attachments
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Files uploaded
 */
router
  .get("/:id/media", authMiddleware, asyncHandler(getAllTicketAssetsController))
  .post(
    "/:id/media",
    authMiddleware,
    upload.array("files"),
    asyncHandler(uploadTicketAssetController),
  );

/**
 * @openapi
 * /api/v1/tickets/{id}/media/{aid}:
 *   get:
 *     summary: Get a single ticket attachment
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: aid
 *         required: true
 *         schema: { type: integer }
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Attachment details
 *
 *   delete:
 *     summary: Delete a ticket attachment
 *     tags: [Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: aid
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Attachment deleted
 */
router
  .get("/:id/media/:aid", authMiddleware, asyncHandler(getSingleTicketAssetController))
  .delete("/:id/media/:aid", authMiddleware, deleteTicketAssetController);

/**
 * @openapi
 * /api/v1/tickets/{id}/chat:
 *   get:
 *     summary: Get chat messages for a ticket
 *     tags: [Tickets, Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             - id: 100
 *               message: "I will look into this right away."
 *               senderName: "John Doe"
 *               createdAt: "2026-05-29T10:15:00.000Z"
 *
 *   post:
 *     summary: Send a chat message on a ticket
 *     tags: [Tickets, Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "I will look into this right away."
 *     responses:
 *       201:
 *         description: Message sent
 */
router
  .get("/:id/chat", authMiddleware, asyncHandler(getChatMessagesForTicketController))
  .post(
    "/:id/chat",
    authMiddleware,
    validate(createMessageSchema),
    asyncHandler(sendChatMessageController),
  );

/**
 * @openapi
 * /api/v1/tickets/{id}/chat/media:
 *   post:
 *     summary: Upload chat media
 *     tags: [Tickets, Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Media uploaded
 */
router.post(
  "/:id/chat/media",
  authMiddleware,
  upload.array("files"),
  asyncHandler(uploadTicketChatMediaController),
);

/**
 * @openapi
 * /api/v1/tickets/{id}/final-report:
 *   get:
 *     summary: Get ticket final report
 *     description: Available for Admin, SuperAdmin, and Technician
 *     tags: [Tickets, Final Report]
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
 *           ticketId: 42
 *           summary: "Issue resolved by resetting the user password."
 *           solutionSteps: "1. Verified identity\n2. Reset password\n3. Confirmed access"
 *           published: false
 *
 *   put:
 *     summary: Create or update ticket final report
 *     tags: [Tickets, Final Report]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [summary, solutionSteps]
 *             properties:
 *               summary:
 *                 type: string
 *                 example: "Issue resolved by resetting the user password."
 *               solutionSteps:
 *                 type: string
 *                 example: "1. Verified identity\n2. Reset password\n3. Confirmed access"
 *     responses:
 *       200:
 *         description: Report saved
 */
router
  .get("/:id/final-report", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(getTicketFinalReportController))
  .put("/:id/final-report", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(upsertTicketFinalReportController));

/**
 * @openapi
 * /api/v1/tickets/{id}/final-report/media:
 *   post:
 *     summary: Upload final report media
 *     tags: [Tickets, Final Report]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Media uploaded
 */
router.post(
  "/:id/final-report/media",
  authMiddleware,
  typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]),
  upload.array("files"),
  asyncHandler(uploadTicketFinalReportMediaController),
);

export default router;

