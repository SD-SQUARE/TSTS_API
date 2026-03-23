import router from "express";
import {
  getPermissionProfiles,
  getPermissionProfileById,
  addPermissionProfile,
  editPermissionProfile,
  deletePermissionProfile,
} from "../controllers/PermissionProfile.controller.js";
import { PermissionProfileSchema } from "../validation/permissionProfile.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../validation/zod-middleware.js";

const permissionProfileRouter = router.Router();

permissionProfileRouter.get("/", asyncHandler(getPermissionProfiles));
permissionProfileRouter.get("/:id", asyncHandler(getPermissionProfileById));
permissionProfileRouter.post("/", validate(PermissionProfileSchema), asyncHandler(addPermissionProfile));
permissionProfileRouter.put("/:id", validate(PermissionProfileSchema), asyncHandler(editPermissionProfile));
permissionProfileRouter.delete("/:id", asyncHandler(deletePermissionProfile));


export default permissionProfileRouter;
