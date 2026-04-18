import { Router } from "express";
import {
  createKnowledgeBaseItem,
  deleteKnowledgeBaseItem,
  getKnowledgeBaseItemById,
  getKnowledgeBaseItems,
  updateKnowledgeBaseItem,
} from "../controllers/KnowlegeBase.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { typeBasedAuthMiddleware } from "../middleware/typeBasedAuthMiddleware.js";
import { UserType } from "../enums/UserType.enum.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateKnowledgeDraftFromReportController,
  getFinalReportByIdController,
  getFinalReportHistoryController,
  listFinalReportsController,
  publishFinalReportController,
  updateFinalReportByIdController,
} from "../controllers/ticketFinalReport.controller.js";

const knowlegeBaseRouter = Router();
knowlegeBaseRouter.get("/", getKnowledgeBaseItems);
knowlegeBaseRouter.post("/", createKnowledgeBaseItem);
knowlegeBaseRouter.get(
  "/generator/reports",
  authMiddleware,
  typeBasedAuthMiddleware([
    UserType.ADMIN,
    UserType.SUPER_ADMIN,
    UserType.TECHNICIAN,
  ]),
  asyncHandler(listFinalReportsController),
);
knowlegeBaseRouter.get(
  "/generator/reports/:reportId",
  authMiddleware,
  typeBasedAuthMiddleware([
    UserType.ADMIN,
    UserType.SUPER_ADMIN,
    UserType.TECHNICIAN,
  ]),
  asyncHandler(getFinalReportByIdController),
);
knowlegeBaseRouter.put(
  "/generator/reports/:reportId",
  authMiddleware,
  typeBasedAuthMiddleware([
    UserType.ADMIN,
    UserType.SUPER_ADMIN,
    UserType.TECHNICIAN,
  ]),
  asyncHandler(updateFinalReportByIdController),
);
knowlegeBaseRouter.get(
  "/generator/reports/:reportId/history",
  authMiddleware,
  typeBasedAuthMiddleware([
    UserType.ADMIN,
    UserType.SUPER_ADMIN,
    UserType.TECHNICIAN,
  ]),
  asyncHandler(getFinalReportHistoryController),
);
knowlegeBaseRouter.post(
  "/generator/reports/:reportId/generate-ai",
  authMiddleware,
  typeBasedAuthMiddleware([
    UserType.ADMIN,
    UserType.SUPER_ADMIN,
    UserType.TECHNICIAN,
  ]),
  asyncHandler(generateKnowledgeDraftFromReportController),
);
knowlegeBaseRouter.post(
  "/generator/reports/:reportId/publish",
  authMiddleware,
  typeBasedAuthMiddleware([
    UserType.ADMIN,
    UserType.SUPER_ADMIN,
    UserType.TECHNICIAN,
  ]),
  asyncHandler(publishFinalReportController),
);
knowlegeBaseRouter.get("/:id", getKnowledgeBaseItemById);
knowlegeBaseRouter.put("/:id", updateKnowledgeBaseItem);
knowlegeBaseRouter.delete("/:id", deleteKnowledgeBaseItem);
export default knowlegeBaseRouter;
