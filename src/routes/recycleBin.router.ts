import { Router } from "express";
import {
  listDeletedRecordsController,
  listRecycleEntitiesController,
  restoreDeletedRecordController,
} from "../controllers/recycleBin.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

/**
 * @openapi
 * /api/v1/recycle-bin/entities:
 *   get:
 *     summary: List recyclable entity types
 *     tags: [Recycle Bin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - entity: "Ticket"
 *               displayName: "Tickets"
 *               deletedCount: 12
 *             - entity: "User"
 *               displayName: "Users"
 *               deletedCount: 3
 *
 * /api/v1/recycle-bin/{entity}:
 *   get:
 *     summary: List deleted records for an entity type
 *     tags: [Recycle Bin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema: { type: string }
 *         example: "Ticket"
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 42
 *               name: "Cannot access email"
 *               deletedAt: "2026-05-28T09:00:00.000Z"
 *               deletedByName: "Admin User"
 *
 * /api/v1/recycle-bin/{entity}/{id}/restore:
 *   post:
 *     summary: Restore a deleted record
 *     tags: [Recycle Bin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema: { type: string }
 *         example: "Ticket"
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         example: 42
 *     responses:
 *       200:
 *         description: Record restored
 *         content:
 *           application/json:
 *             example:
 *               message: "Ticket #42 restored successfully"
 */
router.get("/entities", asyncHandler(listRecycleEntitiesController));
router.get("/:entity", asyncHandler(listDeletedRecordsController));
router.post("/:entity/:id/restore", asyncHandler(restoreDeletedRecordController));

export default router;
