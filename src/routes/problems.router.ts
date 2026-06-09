import { createProblem,updateProblem,getProblemById,getProblems,deleteProblem } from "../controllers/problem.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import{validate} from "../validation/zod-middleware.js";
import { ProblemSchema,UpdateProblemSchema } from "../validation/problem.schema.js";
const router = Router();

/**
 * @openapi
 * /api/v1/problems:
 *   get:
 *     summary: List problems
 *     tags: [Problems]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Cannot connect to WiFi"
 *               specializationId: 1
 *
 *   post:
 *     summary: Create problem
 *     tags: [Problems]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, specializationId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Cannot connect to WiFi"
 *               specializationId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Problem created
 */
router.get("/", asyncHandler(getProblems));
router.post("/", validate(ProblemSchema),asyncHandler(createProblem));

/**
 * @openapi
 * /api/v1/problems/{id}:
 *   get:
 *     summary: Get problem by ID
 *     tags: [Problems]
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
 *           name: "Cannot connect to WiFi"
 *
 *   put:
 *     summary: Update problem
 *     tags: [Problems]
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
 *               specializationId: { type: integer }
 *     responses:
 *       200:
 *         description: Problem updated
 *
 *   delete:
 *     summary: Delete problem
 *     tags: [Problems]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Problem deleted
 */
router.get("/:id", asyncHandler(getProblemById));
router.put("/:id",validate(UpdateProblemSchema), asyncHandler(updateProblem));
router.delete("/:id", asyncHandler(deleteProblem));
export default router;
