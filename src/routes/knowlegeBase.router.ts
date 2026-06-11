import { Router } from "express";
import {
  createKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
  getKnowledgeBaseCategories,
  getKnowledgeBaseItemById,
  getKnowledgeBaseItems,
  updateKnowledgeBaseItem,
} from "../controllers/KnowlegeBase.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { typeBasedAuthMiddleware } from "../middleware/typeBasedAuthMiddleware.js";
import { UserType } from "../enums/UserType.enum.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateKnowledgeDraftFromReportController,
  getFinalReportByIdController,
  getFinalReportHistoryController,
  listFinalReportsController,
  publishFinalReportController,
  updateFinalReportByIdController,
} from "../controllers/ticketFinalReport.controller.js";

const knowlegeBaseRouter = Router();

/**
 * @openapi
 * /api/v1/knowledge-base:
 *   get:
 *     summary: List knowledge base items
 *     tags: [Knowledge Base]
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
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               title: "How to reset your password"
 *               category: "Account Management"
 *               published: true
 *
 *   post:
 *     summary: Create knowledge base item
 *     tags: [Knowledge Base]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, category]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "How to reset your password"
 *               content:
 *                 type: string
 *                 example: "To reset your password, go to..."
 *               category:
 *                 type: string
 *                 example: "Account Management"
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["password", "account"]
 *     responses:
 *       201:
 *         description: Item created
 */
knowlegeBaseRouter.get("/", authMiddleware, getKnowledgeBaseItems);
knowlegeBaseRouter.post(
  "/",
  authMiddleware,
  typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]),
  createKnowledgeBaseItem
);

/**
 * @openapi
 * /api/v1/knowledge-base/categories:
 *   get:
 *     summary: Get knowledge base categories
 *     tags: [Knowledge Base]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - "Account Management"
 *             - "Networking"
 *             - "Hardware"
 */
knowlegeBaseRouter.get("/categories", authMiddleware, getKnowledgeBaseCategories);

/**
 * @openapi
 * /api/v1/knowledge-base/{id}:
 *   get:
 *     summary: Get knowledge base item
 *     tags: [Knowledge Base]
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
 *           title: "How to reset your password"
 *           content: "To reset your password..."
 *           category: "Account Management"
 *           published: false
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *
 *   put:
 *     summary: Update knowledge base item
 *     tags: [Knowledge Base]
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
 *               title: { type: string }
 *               content: { type: string }
 *               category: { type: string }
 *               published: { type: boolean }
 *     responses:
 *       200:
 *         description: Item updated
 *
 *   delete:
 *     summary: Delete knowledge base item
 *     tags: [Knowledge Base]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Item deleted
 */
knowlegeBaseRouter.get("/:id", authMiddleware, getKnowledgeBaseItemById);
knowlegeBaseRouter.put("/:id", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), updateKnowledgeBaseItem);
knowlegeBaseRouter.delete("/:id", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), deleteKnowledgeBaseItem);

/**
 * @openapi
 * /api/v1/knowledge-base/generator/reports:
 *   get:
 *     summary: List final reports for knowledge generation
 *     tags: [Knowledge Base, Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               ticketId: 42
 *               summary: "Password reset resolved the issue."
 *
 * /api/v1/knowledge-base/generator/reports/{reportId}:
 *   get:
 *     summary: Get final report for knowledge generation
 *     tags: [Knowledge Base, Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           id: 1
 *           summary: "Password reset resolved"
 *           solutionSteps: "1. Reset password\n2. Verify access"
 *
 *   put:
 *     summary: Update final report
 *     tags: [Knowledge Base, Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               summary: { type: string }
 *               solutionSteps: { type: string }
 *     responses:
 *       200:
 *         description: Report updated
 */
knowlegeBaseRouter.get("/generator/reports", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(listFinalReportsController));
knowlegeBaseRouter.get("/generator/reports/:reportId", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(getFinalReportByIdController));
knowlegeBaseRouter.put("/generator/reports/:reportId", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(updateFinalReportByIdController));

/**
 * @openapi
 * /api/v1/knowledge-base/generator/reports/{reportId}/history:
 *   get:
 *     summary: Get final report history
 *     tags: [Knowledge Base, Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               summary: "Previous version"
 *               updatedAt: "2026-05-29T10:00:00.000Z"
 *
 * /api/v1/knowledge-base/generator/reports/{reportId}/generate-ai:
 *   post:
 *     summary: Generate knowledge draft from report using AI
 *     tags: [Knowledge Base, Reports, AI Assistant]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         example:
 *           title: "How to reset a user password"
 *           content: "When a user forgets their password..."
 *           category: "Account Management"
 *
 * /api/v1/knowledge-base/generator/reports/{reportId}/publish:
 *   post:
 *     summary: Publish final report as knowledge base item
 *     tags: [Knowledge Base, Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Published as knowledge base item
 */
knowlegeBaseRouter.get("/generator/reports/:reportId/history", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(getFinalReportHistoryController));
knowlegeBaseRouter.post("/generator/reports/:reportId/generate-ai", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(generateKnowledgeDraftFromReportController));
knowlegeBaseRouter.post("/generator/reports/:reportId/publish", authMiddleware, typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN, UserType.TECHNICIAN]), asyncHandler(publishFinalReportController));

export default knowlegeBaseRouter;
