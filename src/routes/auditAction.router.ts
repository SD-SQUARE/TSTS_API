import { Router } from "express";
import {
  getAuditLogByIdController,
  listAuditLogsController,
} from "../controllers/auditAction.controller.js";

const router = Router();

/**
 * @openapi
 * /api/v1/audit-logs:
 *   get:
 *     summary: List audit logs
 *     tags: [Audit]
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
 *         name: userId
 *         schema: { type: integer }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               action: "TicketCreated"
 *               detail: "Created ticket #42"
 *               performedByName: "Jane Smith"
 *               performedByEmail: "jane@university.edu"
 *               createdAt: "2026-05-29T10:00:00.000Z"
 *
 * /api/v1/audit-logs/{id}:
 *   get:
 *     summary: Get audit log by ID
 *     tags: [Audit]
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
 *           action: "TicketCreated"
 *           detail: "Created ticket #42"
 *           metadata:
 *             ticketId: 42
 *             ticketTitle: "Cannot access email"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 */
router.get("/", listAuditLogsController).get("/:id", getAuditLogByIdController);

export default router;
