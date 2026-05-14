import { Router } from "express";
import { aiAssistantChat, aiAssistantHealth, aiCreateTicket } from "../controllers/ai-assistant.controller.js";

const router = Router();

router.post("/chat", aiAssistantChat);
router.post("/create-ticket", aiCreateTicket);
router.get("/health", aiAssistantHealth);

export default router;
