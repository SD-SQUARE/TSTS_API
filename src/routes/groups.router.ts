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

/**
 * @openapi
 * /api/v1/groups:
 *   get:
 *     summary: List all groups
 *     tags: [Groups]
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
 *             - id: 1
 *               name: "Network Support Team"
 *               description: "Handles all network-related issues"
 *               memberCount: 8
 *
 *   post:
 *     summary: Create a group
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Hardware Support Team"
 *               description:
 *                 type: string
 *                 example: "Handles hardware repair and replacement"
 *     responses:
 *       201:
 *         description: Group created
 */
router.get("/", getAllGroupsController);
router.post("/", addGroup);

/**
 * @openapi
 * /api/v1/groups/{id}:
 *   get:
 *     summary: Get group by ID
 *     tags: [Groups]
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
 *           name: "Network Support Team"
 *           description: "Handles all network-related issues"
 *           members:
 *             - id: 5
 *               name: "John Doe"
 *               role: "Lead"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *
 *   put:
 *     summary: Update a group
 *     tags: [Groups]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Group updated
 *
 *   delete:
 *     summary: Delete a group
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Group deleted
 */
router.get("/:id", getGroupController);
router.put("/:id", editGroupController);
router.delete("/:id", deleteGroupController);

/**
 * @openapi
 * /api/v1/groups/{id}/users:
 *   get:
 *     summary: Get group members
 *     tags: [Groups]
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
 *             - id: 5
 *               name: "John Doe"
 *               role: "Lead"
 *               email: "john@tsts.local"
 */
router.get("/:id/users", getGroupUsersController);

/**
 * @openapi
 * /api/v1/groups/{id}/assign:
 *   post:
 *     summary: Assign technicians to group
 *     tags: [Groups]
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
 *             required: [technicianIds]
 *             properties:
 *               technicianIds:
 *                 type: array
 *                 items: { type: integer }
 *                 example: [5, 6, 7]
 *     responses:
 *       200:
 *         description: Assignments updated
 */
router.post("/:id/assign", upsertGroupAssignmentsController);

export default router;
