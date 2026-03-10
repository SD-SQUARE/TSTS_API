import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../middleware/upload.js";
import { createRequesterSchema } from "../validation/requester/createRequester.schema.js";
import { validate } from "../validation/zod-middleware.js";
import {
  createRequester,
  deleteRequester,
  downloadRequesterTemplate,
  EditRequester,
  getRequesterById,
  getRequestersPaged,
  bulkUploadRequesters,
} from "../controllers/requesters.controller.js";
import { validateEmailAndSsnMiddleware } from "../middleware/users/conflictForAdd.js";
import { validateEmailEditSsnMiddleware } from "../middleware/users/conflictForEdit.js";
import { createTechnicianSchema } from "../validation/technician/createTechnician.schema.js";
import {
  createTechnician,
  deleteTechnician,
  EditTechnician,
  getTechnicianById,
  getTechniciansPaged,
} from "../controllers/technicians.controller.js";
import {
  createAdmin,
  deleteAdmin,
  EditAdmin,
  getAdminById,
  getAdminsPaged,
} from "../controllers/admins.controller.js";
import { createAdminSchema } from "../validation/admin/createAdmin.schema.js";
import {
  resetUserPassword,
  getMyProfileById,
  getUserGroups,
  getUserProfileById,
  getUserSpecializations,
} from "../controllers/profile.controller.js";
import {
  getGroupsForUserPagedController,
  getSpecializationsForUserPagedController,
} from "../controllers/users.controller.js";
import { getPermissionsOfUser } from "../controllers/PermissionProfile.controller.js";

const router = Router();

router
  .get("/requesters", asyncHandler(getRequestersPaged))
  .get("/requesters/bulk-sample", asyncHandler(downloadRequesterTemplate))
  .get("/requesters/:id", asyncHandler(getRequesterById))
  .get("/technicians", asyncHandler(getTechniciansPaged))
  .get("/technicians/:id", asyncHandler(getTechnicianById))
  .get("/admins", asyncHandler(getAdminsPaged))
  .get("/admins/:id", asyncHandler(getAdminById))
  .get("/profile/:id/view", asyncHandler(getUserProfileById))
  .get("/profile/:id", asyncHandler(getMyProfileById))
  .post("/profile/:id/reset-password", asyncHandler(resetUserPassword))
  .get("/profile/:id/view/groups", asyncHandler(getUserGroups))
  .get(
    "/profile/:id/view/specializations",
    asyncHandler(getUserSpecializations)
  )
  .get("/:id/groups", asyncHandler(getGroupsForUserPagedController))
  .get(
    "/:id/specializations",
    asyncHandler(getSpecializationsForUserPagedController)
  ).get(
  "/:id/permissions",
  asyncHandler(getPermissionsOfUser)
);
  

router
  .post(
    "/requesters",
    upload.single("image"),
    validate(createRequesterSchema),
    validateEmailAndSsnMiddleware,
    asyncHandler(createRequester),
  )
  .post(
    "/requesters/bulk-sample",
    upload.array("file"),
    asyncHandler(bulkUploadRequesters),
  )
  .post(
    "/technicians",
    upload.single("image"),
    validate(createTechnicianSchema),
    validateEmailAndSsnMiddleware,
    asyncHandler(createTechnician),
  )
  .post(
    "/admins",
    upload.single("image"),
    validate(createAdminSchema),
    validateEmailAndSsnMiddleware,
    asyncHandler(createAdmin),
  );

router
  .put(
    "/requesters/:id",
    upload.single("image"),
    validate(createRequesterSchema),
    validateEmailEditSsnMiddleware,
    asyncHandler(EditRequester),
  )
  .put(
    "/technicians/:id",
    upload.single("image"),
    validate(createTechnicianSchema),
    validateEmailEditSsnMiddleware,
    asyncHandler(EditTechnician),
  )
  .put(
    "/admins/:id",
    upload.single("image"),
    validate(createAdminSchema),
    validateEmailEditSsnMiddleware,
    asyncHandler(EditAdmin),
  );
router
  .delete("/requesters/:id", asyncHandler(deleteRequester))
  .delete("/technicians/:id", asyncHandler(deleteTechnician))
  .delete("/admins/:id", asyncHandler(deleteAdmin));

export default router;
