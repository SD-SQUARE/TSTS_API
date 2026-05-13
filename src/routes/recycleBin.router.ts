import { Router } from "express";
import {
  listDeletedRecordsController,
  listRecycleEntitiesController,
  restoreDeletedRecordController,
} from "../controllers/recycleBin.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router
  .get("/entities", asyncHandler(listRecycleEntitiesController))
  .get("/:entity", asyncHandler(listDeletedRecordsController))
  .post("/:entity/:id/restore", asyncHandler(restoreDeletedRecordController));

export default router;
