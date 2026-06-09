import { Router } from "express";
import {
  createApiKeyController,
  getApiKeyMetaController,
  getApiKeyScopeController,
  listApiKeysController,
  revokeApiKeyController,
  updateApiKeyController,
} from "../controllers/apiKeys.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const apiKeyScopeRouter = Router();

/**
 * @openapi
 * /api/v1/api-integrations/scope:
 *   get:
 *     summary: Get API key scope
 *     description: Returns the scopes available for API keys
 *     tags: [API Integrations]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         example:
 *           scopes:
 *             - "tickets:read"
 *             - "tickets:write"
 *             - "users:read"
 */
apiKeyScopeRouter.get("/scope", asyncHandler(getApiKeyScopeController));

const router = Router();

/**
 * @openapi
 * /api/v1/api-integrations/meta:
 *   get:
 *     summary: Get API key metadata
 *     tags: [API Integrations]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         example:
 *           keyPrefix: "tsts_"
 *           maxKeysPerAdmin: 5
 *
 * /api/v1/api-integrations/keys:
 *   get:
 *     summary: List API keys
 *     tags: [API Integrations]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Frontend Integration"
 *               prefix: "tsts_abc123"
 *               scopes: ["tickets:read", "tickets:write"]
 *               createdAt: "2026-05-29T08:00:00.000Z"
 *
 *   post:
 *     summary: Create API key
 *     tags: [API Integrations]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, scopes]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Mobile App Integration"
 *               scopes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["tickets:read", "tickets:write", "users:read"]
 *     responses:
 *       201:
 *         description: API key created (returns full key only once)
 *         content:
 *           application/json:
 *             example:
 *               id: 2
 *               name: "Mobile App Integration"
 *               key: "tsts_xyz789fullkeyhere"
 *               prefix: "tsts_xyz789"
 *               scopes: ["tickets:read", "tickets:write", "users:read"]
 */
router.get("/meta", asyncHandler(getApiKeyMetaController));
router.get("/keys", asyncHandler(listApiKeysController));
router.post("/keys", asyncHandler(createApiKeyController));

/**
 * @openapi
 * /api/v1/api-integrations/keys/{id}:
 *   patch:
 *     summary: Update API key
 *     tags: [API Integrations]
 *     security:
 *       - ApiKeyAuth: []
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
 *               name:
 *                 type: string
 *               scopes:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: API key updated
 *
 *   delete:
 *     summary: Revoke API key
 *     tags: [API Integrations]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: API key revoked
 */
router.patch("/keys/:id", asyncHandler(updateApiKeyController));
router.delete("/keys/:id", asyncHandler(revokeApiKeyController));

export default router;
