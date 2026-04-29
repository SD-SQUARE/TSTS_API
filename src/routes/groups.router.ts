import { Router } from "express";
import {
  editGroupController,
  addGroup,
  deleteGroupController,
  getAllGroupsController,
  getGroupController,
  getGroupUsersController,
  upsertGroupAssignmentsController,
} from "../controllers/groups.controller.js";

const router = Router();

router.post("/", addGroup);
router.post("/:id/assign", upsertGroupAssignmentsController);
router.put("/:id", editGroupController); // ✅ Edit group
router.get("/:id", getGroupController);
router.delete("/:id", deleteGroupController);
router.get("/", getAllGroupsController);
router.get("/:id/users", getGroupUsersController);

export default router;
