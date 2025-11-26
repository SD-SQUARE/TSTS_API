import { Router } from "express";
import { addGroup } from "../controllers/groups.controller.js";

const router = Router();

router.post("/", addGroup);

export default router;
