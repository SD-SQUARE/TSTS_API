import { Router } from "express";
import {
    aiAssistantChat,
    aiAssistantHealth,
    aiCreateTicket,
    aiGenerateText,
} from "../controllers/ai-assistant.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Apply authentication middleware to all AI assistant routes
router.use(authMiddleware);

/**
 * @openapi
 * /api/v1/ai-assistant/chat:
 *   post:
 *     summary: Chat with AI assistant (SSE streaming)
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 */
router.post("/chat", aiAssistantChat);

/**
 * @openapi
 * /api/v1/ai-assistant/create-ticket:
 *   post:
 *     summary: Create a ticket from AI-prepared preview
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 */
router.post("/create-ticket", asyncHandler(aiCreateTicket));

/**
 * @openapi
 * /api/v1/ai-assistant/generate-text:
 *   post:
 *     summary: Generate organized EN + AR text and summary from raw input
 *     description: |
 *       Takes raw user text and returns:
 *       - Organized English version
 *       - Organized Arabic translation
 *       - Short summary
 *     tags: [AI Assistant]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 description: Raw text to process
 *               fieldContext:
 *                 type: string
 *                 description: Context hint (e.g. "ticket description", "knowledge base article")
 *     responses:
 *       200:
 *         description: Generated text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 en:
 *                   type: string
 *                 ar:
 *                   type: string
 *                 summary:
 *                   type: string
 */
router.post("/generate-text", asyncHandler(aiGenerateText));

/**
 * @openapi
 * /api/v1/ai-assistant/health:
 *   get:
 *     summary: AI assistant health check
 *     tags: [AI Assistant]
 */
router.get("/health", asyncHandler(aiAssistantHealth));

export default router;
