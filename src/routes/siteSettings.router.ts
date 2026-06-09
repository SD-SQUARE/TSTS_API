import { Router } from "express";
import {
  createAllowedEmailDomainController,
  deleteAllowedEmailDomainController,
  getSiteSettingsController,
  listAllowedEmailDomainsController,
  updateAllowedEmailDomainController,
  updateSiteLogoController,
  updateSiteSettingsController,
} from "../controllers/siteSettings.controller.js";
import { upload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

/**
 * @openapi
 * /api/v1/site-settings:
 *   get:
 *     summary: Get site settings
 *     tags: [Site Settings]
 *     responses:
 *       200:
 *         example:
 *           siteName: "TSTS Support Portal"
 *           logoUrl: "https://storage.tsts.local/logo.png"
 *           primaryColor: "#2563eb"
 *           language: "en"
 *
 *   patch:
 *     summary: Update site settings
 *     tags: [Site Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               siteName:
 *                 type: string
 *                 example: "TSTS Support Portal"
 *               primaryColor:
 *                 type: string
 *                 example: "#2563eb"
 *               language:
 *                 type: string
 *                 enum: [en, ar]
 *                 example: "en"
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.get("/", asyncHandler(getSiteSettingsController));
router.patch("/", asyncHandler(updateSiteSettingsController));

/**
 * @openapi
 * /api/v1/site-settings/logo:
 *   patch:
 *     summary: Update site logo
 *     tags: [Site Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Logo updated
 */
router.patch("/logo", upload.single("logo"), asyncHandler(updateSiteLogoController));

/**
 * @openapi
 * /api/v1/site-settings/email-domains:
 *   get:
 *     summary: List allowed email domains
 *     tags: [Site Settings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               domain: "university.edu"
 *               active: true
 *
 *   post:
 *     summary: Create allowed email domain
 *     tags: [Site Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [domain]
 *             properties:
 *               domain:
 *                 type: string
 *                 example: "student.university.edu"
 *     responses:
 *       201:
 *         description: Domain added
 */
router.get("/email-domains", asyncHandler(listAllowedEmailDomainsController));
router.post("/email-domains", asyncHandler(createAllowedEmailDomainController));

/**
 * @openapi
 * /api/v1/site-settings/email-domains/{id}:
 *   put:
 *     summary: Update email domain
 *     tags: [Site Settings]
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
 *               domain: { type: string }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Domain updated
 *
 *   delete:
 *     summary: Delete email domain
 *     tags: [Site Settings]
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
router.put("/email-domains/:id", asyncHandler(updateAllowedEmailDomainController));
router.delete("/email-domains/:id", asyncHandler(deleteAllowedEmailDomainController));

export default router;
