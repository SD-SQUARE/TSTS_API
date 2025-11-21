import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createUser } from "../controllers/users.controller.js";

const router = Router();

router.post("/", asyncHandler(createUser));

export default router;
