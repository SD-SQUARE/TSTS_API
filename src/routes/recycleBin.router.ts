import { Router } from "express";
import {
  listDeletedRecordsController,
  listRecycleEntitiesController,
  restoreDeletedRecordController,
  updateDeletedRecordController,
} from "../controllers/recycleBin.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router
  .get("/entities", asyncHandler(listRecycleEntitiesController))
  .get("/:entity", asyncHandler(listDeletedRecordsController))
  .put("/:entity/:id", asyncHandler(updateDeletedRecordController))
  .post("/:entity/:id/restore", asyncHandler(restoreDeletedRecordController));

export default router;
