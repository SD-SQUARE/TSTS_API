import { Router } from "express";
import {
  broadcastNotificationController,
  getNotificationByIdController,
  getNotificationsController,
  getUnreadCountController,
  markNotificationAsReadController,
} from "../controllers/notifications.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", getNotificationsController);
router.get("/unread-count", getUnreadCountController);
router.post("/broadcast", broadcastNotificationController);
router.get("/:id", getNotificationByIdController);
router.patch("/:id/read", markNotificationAsReadController);

export default router;
