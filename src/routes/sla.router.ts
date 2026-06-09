import { Router } from "express";
import {
  createSlaRuleController,
  deleteSlaRuleController,
  getSlaRuleController,
  listSlaRulesController,
  updateSlaRuleController,
} from "../controllers/sla.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

/**
 * @openapi
 * /api/v1/sla-rules:
 *   get:
 *     summary: List SLA rules
 *     tags: [SLA]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "High Priority Response"
 *               priority: "High"
 *               responseTimeMinutes: 60
 *               resolutionTimeMinutes: 240
 *
 *   post:
 *     summary: Create SLA rule
 *     tags: [SLA]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, priority, responseTimeMinutes, resolutionTimeMinutes]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Critical Response"
 *               priority:
 *                 type: string
 *                 enum: [Low, Medium, High, Critical]
 *                 example: "Critical"
 *               responseTimeMinutes:
 *                 type: integer
 *                 example: 15
 *               resolutionTimeMinutes:
 *                 type: integer
 *                 example: 60
 *               active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: SLA rule created
 */
router.get("/", asyncHandler(listSlaRulesController));
router.post("/", asyncHandler(createSlaRuleController));

/**
 * @openapi
 * /api/v1/sla-rules/{id}:
 *   get:
 *     summary: Get SLA rule by ID
 *     tags: [SLA]
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
 *           name: "High Priority Response"
 *           priority: "High"
 *           responseTimeMinutes: 60
 *           resolutionTimeMinutes: 240
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *
 *   put:
 *     summary: Update SLA rule
 *     tags: [SLA]
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
 *               name: { type: string }
 *               priority: { type: string }
 *               responseTimeMinutes: { type: integer }
 *               resolutionTimeMinutes: { type: integer }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: SLA rule updated
 *
 *   delete:
 *     summary: Delete SLA rule
 *     tags: [SLA]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: SLA rule deleted
 */
router.get("/:id", asyncHandler(getSlaRuleController));
router.put("/:id", asyncHandler(updateSlaRuleController));
router.delete("/:id", asyncHandler(deleteSlaRuleController));

export default router;
