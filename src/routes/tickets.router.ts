import { Router } from "express";
import { upload } from "../middleware/upload.js";
import { createTicketController } from "../controllers/tickets.controller.js";

const router = Router();

router.post("/", upload.array("media"), (req, res) =>
  createTicketController(req, res)
);

export default router;
