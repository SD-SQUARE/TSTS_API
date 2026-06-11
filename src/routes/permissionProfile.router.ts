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

/**
 * @openapi
 * /api/v1/permissions/profile:
 *   get:
 *     summary: List permission profiles
 *     tags: [Permission Profiles]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Full Admin"
 *               permissions: ["tickets.*", "users.*", "reports.*"]
 *             - id: 2
 *               name: "Read Only"
 *               permissions: ["tickets.read", "users.read"]
 *
 *   post:
 *     summary: Create permission profile
 *     tags: [Permission Profiles]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, permissions]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Technician Profile"
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["tickets.read", "tickets.write", "chat.write"]
 *     responses:
 *       201:
 *         description: Profile created
 */
permissionProfileRouter.get("/", asyncHandler(getPermissionProfiles));
permissionProfileRouter.post("/", validate(PermissionProfileSchema), asyncHandler(addPermissionProfile));

/**
 * @openapi
 * /api/v1/permissions/profile/{id}:
 *   get:
 *     summary: Get permission profile by ID
 *     tags: [Permission Profiles]
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
 *           id: 1
 *           name: "Full Admin"
 *           permissions: ["tickets.*", "users.*", "reports.*"]
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *
 *   put:
 *     summary: Update permission profile
 *     tags: [Permission Profiles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               permissions:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *
 *   delete:
 *     summary: Delete permission profile
 *     tags: [Permission Profiles]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Profile deleted
 */
permissionProfileRouter.get("/:id", asyncHandler(getPermissionProfileById));
permissionProfileRouter.put("/:id", validate(PermissionProfileSchema), asyncHandler(editPermissionProfile));
permissionProfileRouter.delete("/:id", asyncHandler(deletePermissionProfile));

export default permissionProfileRouter;
