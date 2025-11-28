import { Router } from "express";
import {
  addGroup,
  bulkAssignUsersController,
  deleteGroupController,
  getAllGroupsController,
  getGroupController,
  getGroupUsersController,
} from "../controllers/groups.controller.js";

const router = Router();

router.post("/", addGroup);
router.post("/:id/assign", bulkAssignUsersController);
router.get("/:id", getGroupController);
router.delete("/:id", deleteGroupController);
router.get("/", getAllGroupsController);
router.get("/:id/users", getGroupUsersController);

export default router;
