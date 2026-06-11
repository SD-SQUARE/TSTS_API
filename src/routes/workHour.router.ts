import { createWorkHour,getWorkHours,getWorkHourById,updateWorkHour,deleteWorkHour } from "../controllers/WorkHour.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

/**
 * @openapi
 * /api/v1/work-hours:
 *   get:
 *     summary: List work hours
 *     tags: [Work Hours]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               dayOfWeek: "Monday"
 *               startTime: "09:00"
 *               endTime: "17:00"
 *               userId: 5
 *
 *   post:
 *     summary: Create work hour entry
 *     tags: [Work Hours]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dayOfWeek, startTime, endTime]
 *             properties:
 *               dayOfWeek:
 *                 type: string
 *                 enum: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
 *                 example: "Monday"
 *               startTime:
 *                 type: string
 *                 pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$"
 *                 example: "09:00"
 *               endTime:
 *                 type: string
 *                 pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$"
 *                 example: "17:00"
 *               userId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Work hour entry created
 */
router.get("/", asyncHandler(getWorkHours));
router.post("/", asyncHandler(createWorkHour));

/**
 * @openapi
 * /api/v1/work-hours/{id}:
 *   get:
 *     summary: Get work hour entry by ID
 *     tags: [Work Hours]
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
 *           dayOfWeek: "Monday"
 *           startTime: "09:00"
 *           endTime: "17:00"
 *
 *   put:
 *     summary: Update work hour entry
 *     tags: [Work Hours]
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
 *               dayOfWeek: { type: string }
 *               startTime: { type: string }
 *               endTime: { type: string }
 *     responses:
 *       200:
 *         description: Entry updated
 *
 *   delete:
 *     summary: Delete work hour entry
 *     tags: [Work Hours]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Entry deleted
 */
router.get("/:id", asyncHandler(getWorkHourById));
router.put("/:id", asyncHandler(updateWorkHour));
router.delete("/:id", asyncHandler(deleteWorkHour));
export default router;
