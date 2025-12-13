import { Router } from "express";
import { upload } from "../middleware/upload.js";
import {
  createTicketController,
  getAllTicketsController,
  getSingleTicketController,
  getTicketActivitiesController,
} from "../controllers/tickets.controller.js";
import { validate } from "../validation/zod-middleware.js";
import { getTicketsSchema } from "../validation/ticket.schema.js";

const router = Router();

router.post("/", upload.array("media"), (req, res) =>
  createTicketController(req, res)
);
router.get("/", validate(getTicketsSchema), getAllTicketsController);
router.get("/:id", getSingleTicketController);
router.get("/:id/activities", getTicketActivitiesController);

export default router;
