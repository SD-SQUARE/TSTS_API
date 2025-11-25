import { createWorkHour,getWorkHours,getWorkHourById,updateWorkHour,deleteWorkHour } from "../controllers/WorkHour.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getWorkHours));
router.post("/", asyncHandler(createWorkHour));
router.get("/:id", asyncHandler(getWorkHourById));
router.put("/:id", asyncHandler(updateWorkHour));
router.delete("/:id", asyncHandler(deleteWorkHour));
export default router;