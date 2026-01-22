import { Router } from "express";
import { upload } from "../middleware/upload.js";
import {
  createTicketController,
  deleteTicketController,
  getAllTicketsController,
  getSingleTicketController,
  getTicketActivitiesController,
  editTicketForAdminsAndTechniciansController,
  editTicketForRequesterController,
  getAllTicketAssetsController,
  getSingleTicketAssetController,
  uploadTicketAssetController,
  deleteTicketAssetController,
  uploadTicketChatMediaController,
  sendChatMessageController,
  getChatMessagesForTicketController,
} from "../controllers/tickets.controller.js";
import { validate } from "../validation/zod-middleware.js";
import { getTicketsSchema } from "../validation/ticket.schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { typeBasedAuthMiddleware } from "../middleware/typeBasedAuthMiddleware.js";
import { UserType } from "../enums/UserType.enum.js";
import { editTicketForAdminAndTechniciansSchema } from "../validation/tickets/edit-for-admins-and-technicians.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { editTicketForRequesterSchema } from "../validation/tickets/edit-for-requester.js";
import { createMessageSchema } from "../validation/tickets/chat/send-chat-message.schema.js";

const router = Router();

router.post("/", upload.array("media"), (req, res) =>
  createTicketController(req, res)
);

router
  .post(
    "/:id/media",
    authMiddleware,
    upload.array("files"),
    asyncHandler(uploadTicketAssetController)
  )
  .post(
    "/:id/chat/media",
    authMiddleware,
    upload.array("files"),
    asyncHandler(uploadTicketChatMediaController)
  )
  .post(
    "/:id/chat",
    authMiddleware,
    validate(createMessageSchema),
    asyncHandler(sendChatMessageController)
  );

router.get("/", validate(getTicketsSchema), getAllTicketsController);
router.get("/:id", getSingleTicketController);
router.get("/:id/activities", getTicketActivitiesController);

router
  .get("/:id/media", authMiddleware, asyncHandler(getAllTicketAssetsController))
  .get(
    "/:id/media/:aid",
    authMiddleware,
    asyncHandler(getSingleTicketAssetController)
  )
  .get(
    "/:id/chat",
    authMiddleware,
    asyncHandler(getChatMessagesForTicketController)
  );

router
  .put(
    "/:id/co-ordinate",
    upload.none(),
    authMiddleware,
    typeBasedAuthMiddleware([
      UserType.ADMIN,
      UserType.SUPER_ADMIN,
      UserType.TECHNICIAN,
    ]),
    validate(editTicketForAdminAndTechniciansSchema),
    asyncHandler(editTicketForAdminsAndTechniciansController)
  )
  .put(
    "/:id",
    upload.none(),
    authMiddleware,
    typeBasedAuthMiddleware([UserType.REQUESTER]),
    validate(editTicketForRequesterSchema),
    asyncHandler(editTicketForRequesterController)
  );

router
  .delete(
    "/:id",
    authMiddleware,
    typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN]),
    deleteTicketController
  )
  .delete("/:id/media/:aid", authMiddleware, deleteTicketAssetController);

export default router;
