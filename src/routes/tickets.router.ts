import { Router } from "express";
import { upload } from "../middleware/upload.js";
import {
  createTicketController,
  deleteTicketController,
  getAllTicketsController,
  getSingleTicketController,
  getTicketActivitiesController,
} from "../controllers/tickets.controller.js";
import { validate } from "../validation/zod-middleware.js";
import { getTicketsSchema } from "../validation/ticket.schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { typeBasedAuthMiddleware } from "../middleware/typeBasedAuthMiddleware.js";
import { UserType } from "../enums/UserType.enum.js";

const router = Router();

router.post("/", upload.array("media"), (req, res) =>
  createTicketController(req, res)
);
router.get("/", validate(getTicketsSchema), getAllTicketsController);
router.get("/:id", getSingleTicketController);
router.get("/:id/activities", getTicketActivitiesController);

router.delete(
  "/:id",
  authMiddleware,
  typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN]),
  deleteTicketController
);

export default router;
