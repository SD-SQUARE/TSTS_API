import {createUniversity, getAllUniversities,updateUniversity,getUniversityById,deleteUniversity} from "../controllers/universities.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();

/**
 * @openapi
 * /api/v1/universities:
 *   get:
 *     summary: List universities
 *     tags: [Universities]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Cairo University"
 *               code: "CU"
 *
 *   post:
 *     summary: Create university
 *     tags: [Universities]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Ain Shams University"
 *               code:
 *                 type: string
 *                 example: "ASU"
 *     responses:
 *       201:
 *         description: University created
 */
router.get("/", asyncHandler(getAllUniversities));
router.post("/", asyncHandler(createUniversity));

/**
 * @openapi
 * /api/v1/universities/{id}:
 *   get:
 *     summary: Get university by ID
 *     tags: [Universities]
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
 *           name: "Cairo University"
 *           code: "CU"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *
 *   put:
 *     summary: Update university
 *     tags: [Universities]
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
 *               code: { type: string }
 *     responses:
 *       200:
 *         description: University updated
 *
 *   delete:
 *     summary: Delete university
 *     tags: [Universities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: University deleted
 */
router.get("/:id",asyncHandler(getUniversityById));
router.put("/:id", asyncHandler(updateUniversity));
router.delete("/:id",asyncHandler(deleteUniversity));
export default router;
