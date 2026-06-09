import { getAllDomains,getDomainById,createDomain,updateDomain,deleteDomain } from "../controllers/Domains.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();

/**
 * @openapi
 * /api/v1/domains:
 *   get:
 *     summary: List domains
 *     tags: [Domains]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Engineering"
 *               code: "ENG"
 *               universityId: 1
 *
 *   post:
 *     summary: Create domain
 *     tags: [Domains]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, universityId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Medicine"
 *               code:
 *                 type: string
 *                 example: "MED"
 *               universityId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Domain created
 */
router.get("/",asyncHandler(getAllDomains));
router.post("/",asyncHandler(createDomain));

/**
 * @openapi
 * /api/v1/domains/{id}:
 *   get:
 *     summary: Get domain by ID
 *     tags: [Domains]
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
 *           name: "Engineering"
 *           code: "ENG"
 *
 *   put:
 *     summary: Update domain
 *     tags: [Domains]
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
 *         description: Domain updated
 *
 *   delete:
 *     summary: Delete domain
 *     tags: [Domains]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Domain deleted
 */
router.get("/:id",asyncHandler(getDomainById));
router.put("/:id",asyncHandler(updateDomain));
router.delete("/:id",asyncHandler(deleteDomain));
export default router;
