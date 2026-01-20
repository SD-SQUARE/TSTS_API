import {createUniversity, getAllUniversities,updateUniversity,getUniversityById,deleteUniversity} from "../controllers/universities.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();

router.get("/", asyncHandler(getAllUniversities));
router.post("/", asyncHandler(createUniversity));
router.get("/:id",asyncHandler( getUniversityById));
router.put("/:id", asyncHandler(updateUniversity));
router.delete("/:id",asyncHandler( deleteUniversity));
export default router;