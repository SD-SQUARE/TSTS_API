import { Router } from "express";
import {
  sendPersonalMessageController,
  getPersonalMessagesController,
  getPersonalConversations,
  sendGroupMessageController,
  getGroupMessagesController,
  listGroupConversationsController,
  getCombinedChatInboxController,
  getUnreadPersonalMessagesCount,
} from "../controllers/chat.controller.js";
import { upload } from "../middleware/upload.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/personal/:userId/messages",
  upload.array("attachments"),
  sendPersonalMessageController
);

router.get(
  "/personal/:userId/messages",
  getPersonalMessagesController
);

router.get(
  "/personal/conversations",
  getPersonalConversations
);
router.get("/personal/unread-count", getUnreadPersonalMessagesCount);

router.post(
  "/group/:groupId/messages",
  upload.array("attachments"),
  sendGroupMessageController
);

router.get(
  "/group/:groupId/messages",
  getGroupMessagesController
);

router.get(
  "/group/conversations",
  listGroupConversationsController
);

router.get(
  "/conversations",
  getCombinedChatInboxController
);


export default router;
