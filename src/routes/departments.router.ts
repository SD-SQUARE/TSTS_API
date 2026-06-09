import { getDepartmentById,getAllDepartments,updateDepartment,createDepartment,deleteDepartment,getDepartmentUsers } from "../controllers/Departments.controller.js";
import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = Router();

/**
 * @openapi
 * /api/v1/departments:
 *   get:
 *     summary: List departments
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: 1
 *               name: "Computer Science"
 *               code: "CS"
 *               domainId: 1
 *
 *   post:
 *     summary: Create department
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, domainId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Software Engineering"
 *               code:
 *                 type: string
 *                 example: "SE"
 *               domainId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Department created
 */
router.post("/",asyncHandler(createDepartment));
router.get("/",asyncHandler(getAllDepartments));

/**
 * @openapi
 * /api/v1/departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
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
 *           name: "Computer Science"
 *           code: "CS"
 *
 *   put:
 *     summary: Update department
 *     tags: [Departments]
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
 *               code: { type: string }
 *     responses:
 *       200:
 *         description: Department updated
 *
 *   delete:
 *     summary: Delete department
 *     tags: [Departments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Department deleted
 */
router.get("/:id",asyncHandler(getDepartmentById));
router.put("/:id",asyncHandler(updateDepartment));
router.delete("/:id",asyncHandler(deleteDepartment));

/**
 * @openapi
 * /api/v1/departments/{id}/users:
 *   get:
 *     summary: Get department users
 *     tags: [Departments]
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
 *             - id: 10
 *               name: "Jane Smith"
 *               email: "jane@university.edu"
 */
router.get("/:id/users",asyncHandler(getDepartmentUsers));

export default router;
