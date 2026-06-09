import { createSpecialization,updateSpecialization,getSpecializationById,getAllSpecializations,deleteSpecialization } from "../controllers/Specialization.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();

/**
 * @openapi
 * /api/v1/specializations:
 *   get:
 *     summary: List specializations
 *     tags: [Specializations]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Networking"
 *               code: "NET"
 *
 *   post:
 *     summary: Create specialization
 *     tags: [Specializations]
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
 *                 example: "Cybersecurity"
 *               code:
 *                 type: string
 *                 example: "SEC"
 *     responses:
 *       201:
 *         description: Specialization created
 */
router.get("/", asyncHandler(getAllSpecializations));
router.post("/", asyncHandler(createSpecialization));

/**
 * @openapi
 * /api/v1/specializations/{id}:
 *   get:
 *     summary: Get specialization by ID
 *     tags: [Specializations]
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
 *           name: "Networking"
 *           code: "NET"
 *
 *   put:
 *     summary: Update specialization
 *     tags: [Specializations]
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
 *         description: Specialization updated
 *
 *   delete:
 *     summary: Delete specialization
 *     tags: [Specializations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Specialization deleted
 */
router.get("/:id", asyncHandler(getSpecializationById));
router.put("/:id", asyncHandler(updateSpecialization));
router.delete("/:id", asyncHandler(deleteSpecialization));
export default router;
