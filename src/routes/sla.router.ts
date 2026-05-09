import { Router } from "express";
import {
  createSlaRuleController,
  deleteSlaRuleController,
  getSlaRuleController,
  listSlaRulesController,
  updateSlaRuleController,
} from "../controllers/sla.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router
  .get("/", asyncHandler(listSlaRulesController))
  .get("/:id", asyncHandler(getSlaRuleController))
  .post("/", asyncHandler(createSlaRuleController))
  .put("/:id", asyncHandler(updateSlaRuleController))
  .delete("/:id", asyncHandler(deleteSlaRuleController));

export default router;
