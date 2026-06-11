import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { upload } from "../middleware/upload.js";
import { createRequesterSchema, editRequesterSchema } from "../validation/requester/createRequester.schema.js";
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
import { createTechnicianSchema, editTechnicianSchema } from "../validation/technician/createTechnician.schema.js";
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
import { createAdminSchema, editAdminSchema } from "../validation/admin/createAdmin.schema.js";
import {
  resetUserPassword,
  getMyProfileById,
  getUserGroups,
  getUserProfileById,
  getUserSpecializations,
} from "../controllers/profile.controller.js";
import { getSystemInfoController } from "../controllers/systemInfo.controller.js";
import {
  getGroupsForUserPagedController,
  getSpecializationsForUserPagedController,
  toggleRoleProfileEditAccessController,
  toggleUserProfileEditAccessController,
} from "../controllers/users.controller.js";
import { getPermissionsOfUser } from "../controllers/PermissionProfile.controller.js";
import { typeBasedAuthMiddleware } from "../middleware/typeBasedAuthMiddleware.js";
import { UserType } from "../enums/UserType.enum.js";
import { updateProfileImageController } from "../controllers/profile.controller.js";
import { validateAllowedEmailDomainMiddleware } from "../middleware/users/allowedEmailDomain.js";

const router = Router();

/**
 * @openapi
 * /api/v1/users/requesters:
 *   get:
 *     summary: List requesters
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 10
 *               name: "Jane Smith"
 *               email: "jane@university.edu"
 *               department: "Computer Science"
 *
 *   post:
 *     summary: Create requester
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, ssn, departmentId, universityId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Jane Smith"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@university.edu"
 *               ssn:
 *                 type: string
 *                 example: "123-45-6789"
 *               departmentId:
 *                 type: integer
 *                 example: 3
 *               universityId:
 *                 type: integer
 *                 example: 1
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image
 *     responses:
 *       201:
 *         description: Requester created
 *       400:
 *         $ref: "#/components/responses/ValidationError"
 *
 * /api/v1/users/requesters/bulk-sample:
 *   get:
 *     summary: Download requester bulk-upload template
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Excel template file
 *
 * /api/v1/users/requesters/{id}:
 *   get:
 *     summary: Get requester by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Requester details
 *
 * /api/v1/users/requesters/bulk-sample (POST):
 *   post:
 *     summary: Bulk upload requesters
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import completed
 */
router
  .get("/requesters", asyncHandler(getRequestersPaged))
  .get("/requesters/bulk-sample", asyncHandler(downloadRequesterTemplate))
  .get("/requesters/:id", asyncHandler(getRequesterById))
  .post(
    "/requesters",
    upload.single("image"),
    validate(createRequesterSchema),
    validateAllowedEmailDomainMiddleware,
    validateEmailAndSsnMiddleware,
    asyncHandler(createRequester),
  )
  .post(
    "/requesters/bulk-sample",
    upload.array("file"),
    asyncHandler(bulkUploadRequesters),
  );

/**
 * @openapi
 * /api/v1/users/requesters/{id} (PUT):
 *   put:
 *     summary: Update requester
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               departmentId:
 *                 type: integer
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Requester updated
 *
 * /api/v1/users/requesters/{id} (DELETE):
 *   delete:
 *     summary: Delete requester
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Requester deleted
 */
router.put(
  "/requesters/:id",
  upload.single("image"),
  validate(editRequesterSchema),
  validateAllowedEmailDomainMiddleware,
  validateEmailEditSsnMiddleware,
  asyncHandler(EditRequester),
);
router.delete("/requesters/:id", asyncHandler(deleteRequester));

/**
 * @openapi
 * /api/v1/users/technicians:
 *   get:
 *     summary: List technicians
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 5
 *               name: "John Doe"
 *               email: "john@tsts.local"
 *               specializations: ["Networking", "Hardware"]
 *
 *   post:
 *     summary: Create technician
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, ssn]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 example: "john@tsts.local"
 *               ssn:
 *                 type: string
 *                 example: "987-65-4321"
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Technician created
 */
router
  .get("/technicians", asyncHandler(getTechniciansPaged))
  .post(
    "/technicians",
    upload.single("image"),
    validate(createTechnicianSchema),
    validateAllowedEmailDomainMiddleware,
    validateEmailAndSsnMiddleware,
    asyncHandler(createTechnician),
  );

/**
 * @openapi
 * /api/v1/users/technicians/{id}:
 *   get:
 *     summary: Get technician by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Technician details
 */
router.get("/technicians/:id", asyncHandler(getTechnicianById));

/**
 * @openapi
 * /api/v1/users/technicians/{id} (PUT):
 *   put:
 *     summary: Update technician
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Technician updated
 */
router.put(
  "/technicians/:id",
  upload.single("image"),
  validate(editTechnicianSchema),
  validateAllowedEmailDomainMiddleware,
  validateEmailEditSsnMiddleware,
  asyncHandler(EditTechnician),
);

router.delete("/technicians/:id", asyncHandler(deleteTechnician));

/**
 * @openapi
 * /api/v1/users/admins:
 *   get:
 *     summary: List admins
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 2
 *               name: "Alice Admin"
 *               email: "alice@tsts.local"
 *
 *   post:
 *     summary: Create admin
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, email, ssn]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Alice Admin"
 *               email:
 *                 type: string
 *                 example: "alice@tsts.local"
 *               ssn:
 *                 type: string
 *                 example: "111-22-3333"
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Admin created
 */
router
  .get("/admins", asyncHandler(getAdminsPaged))
  .post(
    "/admins",
    upload.single("image"),
    validate(createAdminSchema),
    validateAllowedEmailDomainMiddleware,
    validateEmailAndSsnMiddleware,
    asyncHandler(createAdmin),
  );

/**
 * @openapi
 * /api/v1/users/admins/{id}:
 *   get:
 *     summary: Get admin by ID
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Admin details
 */
router.get("/admins/:id", asyncHandler(getAdminById));

/**
 * @openapi
 * /api/v1/users/admins/{id} (PUT):
 *   put:
 *     summary: Update admin
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Admin updated
 */
router.put(
  "/admins/:id",
  upload.single("image"),
  validate(editAdminSchema),
  validateAllowedEmailDomainMiddleware,
  validateEmailEditSsnMiddleware,
  asyncHandler(EditAdmin),
);

router.delete("/admins/:id", asyncHandler(deleteAdmin));

/**
 * @openapi
 * /api/v1/users/system/info:
 *   get:
 *     summary: Get system info
 *     tags: [Users]
 *     responses:
 *       200:
 *         example:
 *           version: "1.0.0"
 *           environment: "production"
 *           features: ["tickets", "chat", "reports"]
 */
router.get("/system/info", asyncHandler(getSystemInfoController));

/**
 * @openapi
 * /api/v1/users/profile/{id}/view:
 *   get:
 *     summary: View user profile
 *     tags: [Users, Profile]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           id: 5
 *           name: "John Doe"
 *           email: "john@tsts.local"
 *           userType: "Technician"
 */
router.get("/profile/:id/view", asyncHandler(getUserProfileById));

/**
 * @openapi
 * /api/v1/users/profile/{id}:
 *   get:
 *     summary: Get my profile
 *     tags: [Users, Profile]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           id: 5
 *           name: "John Doe"
 *           email: "john@tsts.local"
 *
 *   patch:
 *     summary: Update profile image
 *     tags: [Users, Profile]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image updated
 */
router
  .get("/profile/:id", asyncHandler(getMyProfileById))
  .patch("/profile/:id/image", upload.single("image"), asyncHandler(updateProfileImageController));

/**
 * @openapi
 * /api/v1/users/profile/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Users, Profile]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset
 */
router.post("/profile/:id/reset-password", asyncHandler(resetUserPassword));

router.get("/profile/:id/view/groups", asyncHandler(getUserGroups));
router.get("/profile/:id/view/specializations", asyncHandler(getUserSpecializations));

/**
 * @openapi
 * /api/v1/users/{id}/groups:
 *   get:
 *     summary: Get user groups
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Network Support Team"
 *
 * /api/v1/users/{id}/specializations:
 *   get:
 *     summary: Get user specializations
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 3
 *               name: "Networking"
 *
 * /api/v1/users/{id}/permissions:
 *   get:
 *     summary: Get user permissions
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         example:
 *           permissions:
 *             - "tickets.create"
 *             - "tickets.view"
 */
router
  .get("/:id/groups", asyncHandler(getGroupsForUserPagedController))
  .get("/:id/specializations", asyncHandler(getSpecializationsForUserPagedController))
  .get("/:id/permissions", asyncHandler(getPermissionsOfUser));

/**
 * @openapi
 * /api/v1/users/profile-edit-access/role/{role}:
 *   patch:
 *     summary: Toggle profile edit access by role
 *     description: Admin only
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: role
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Access toggled
 *
 * /api/v1/users/profile-edit-access/{id}:
 *   patch:
 *     summary: Toggle profile edit access for user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Access toggled
 */
router
  .patch("/profile-edit-access/role/:role", typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN]), asyncHandler(toggleRoleProfileEditAccessController))
  .patch("/profile-edit-access/:id", typeBasedAuthMiddleware([UserType.ADMIN, UserType.SUPER_ADMIN]), asyncHandler(toggleUserProfileEditAccessController));

export default router;
