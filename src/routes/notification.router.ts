import { Router } from "express";
import {
  broadcastNotificationController,
  deleteNotificationsController,
  getNotificationByIdController,
  getNotificationsController,
  getUnreadCountController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
} from "../controllers/notifications.controller.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", getNotificationsController);
router.get("/unread-count", getUnreadCountController);
router.post("/broadcast", broadcastNotificationController);
router.delete("/", deleteNotificationsController);
router.patch("/read-all", markAllNotificationsAsReadController);
router.get("/:id", getNotificationByIdController);
router.patch("/:id/read", markNotificationAsReadController);

export default router;
