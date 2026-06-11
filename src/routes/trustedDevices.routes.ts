import { Router } from "express";
import {
  listTrustedDevices,
  getRegisterOptions,
  verifyAndCreateDevice,
  removeTrustedDevice,
  adminListTrustedDevices,
  deleteTrustedDevice,
} from "../controllers/trustedDevices.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { webAuthnSessionMiddleware } from "../config/session.js";

const router = Router();

router.use(webAuthnSessionMiddleware);
router.use(authMiddleware);

/**
 * @openapi
 * /api/v1/trusted-devices:
 *   get:
 *     summary: List my trusted devices
 *     tags: [Trusted Devices]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               deviceName: "Chrome on Windows"
 *               createdAt: "2026-05-29T08:00:00.000Z"
 *               lastUsedAt: "2026-05-29T10:00:00.000Z"
 */
router.get("/", asyncHandler(listTrustedDevices));

/**
 * @openapi
 * /api/v1/trusted-devices/options:
 *   post:
 *     summary: Get WebAuthn registration options
 *     tags: [Trusted Devices]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           challenge: "abc123challenge"
 *           rp:
 *             name: "TSTS"
 *           user:
 *             id: "5"
 *             name: "john@tsts.local"
 */
router.post("/options",asyncHandler(getRegisterOptions));

/**
 * @openapi
 * /api/v1/trusted-devices/verify:
 *   post:
 *     summary: Verify and register trusted device
 *     tags: [Trusted Devices]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential, deviceName]
 *             properties:
 *               credential:
 *                 type: object
 *                 description: WebAuthn credential response
 *               deviceName:
 *                 type: string
 *                 example: "Chrome on Mac"
 *     responses:
 *       201:
 *         description: Device registered
 */
router.post("/verify",asyncHandler(verifyAndCreateDevice));

/**
 * @openapi
 * /api/v1/trusted-devices/{id}:
 *   delete:
 *     summary: Remove a trusted device
 *     tags: [Trusted Devices]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Device removed
 */
router.delete("/:id",asyncHandler(removeTrustedDevice));

/**
 * @openapi
 * /api/v1/trusted-devices/admin-view:
 *   get:
 *     summary: Admin view of all trusted devices
 *     tags: [Trusted Devices, Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               deviceName: "Chrome on Windows"
 *               userEmail: "john@tsts.local"
 *               createdAt: "2026-05-29T08:00:00.000Z"
 */
router.get("/admin-view", adminListTrustedDevices);

/**
 * @openapi
 * /api/v1/trusted-devices/admin-view/{id}:
 *   delete:
 *     summary: Admin delete of trusted device
 *     tags: [Trusted Devices, Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Device removed
 */
router.delete("/admin-view/:id", deleteTrustedDevice);

export default router;
