import { Router } from "express";
import { CustomFormController } from "../controllers/CustomFormController.js";
import { apiKeyAuthMiddleware } from "../middleware/apiKeyAuth.js";
import { authMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate } from "../validation/zod-middleware.js";
import {
  createCustomFormSchema,
  createCustomFormShareLinkSchema,
  customFormListSchema,
  duplicateCustomFormSchema,
  updateCustomFormSchema,
} from "../validation/customForm.schema.js";

const router = Router();

/**
 * @openapi
 * /api/v1/custom-forms/public/{token}:
 *   get:
 *     summary: Get public form by token
 *     description: Retrieve a shareable form using its public token (no auth needed)
 *     tags: [Custom Forms]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         example: "abc123share456"
 *     responses:
 *       200:
 *         example:
 *           id: 1
 *           title: "IT Support Request"
 *           fields:
 *             - id: "email"
 *               type: "email"
 *               label: "Your Email"
 *               required: true
 *             - id: "details"
 *               type: "textarea"
 *               label: "Issue Details"
 *               required: true
 *
 *   post:
 *     summary: Submit a public form
 *     tags: [Custom Forms]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               responses:
 *                 type: object
 *                 description: Key-value pairs matching form field IDs
 *           example:
 *             responses:
 *               email: "user@university.edu"
 *               details: "I cannot access my email"
 *     responses:
 *       201:
 *         description: Form submitted
 */
router.get("/public/:token", asyncHandler(CustomFormController.getByToken));
router.post("/public/:token/submit", asyncHandler(CustomFormController.submitPublic));

router.use(apiKeyAuthMiddleware);
router.use(authMiddleware);

/**
 * @openapi
 * /api/v1/custom-forms:
 *   post:
 *     summary: Create custom form
 *     tags: [Custom Forms]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, fields]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "IT Support Request Form"
 *               description:
 *                 type: string
 *               fields:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     type: { type: string, enum: [text, email, textarea, select, checkbox] }
 *                     label: { type: string }
 *                     required: { type: boolean }
 *                     options:
 *                       type: array
 *                       items: { type: string }
 *                 example:
 *                   - id: "email"
 *                     type: "email"
 *                     label: "Your Email"
 *                     required: true
 *                   - id: "priority"
 *                     type: "select"
 *                     label: "Priority"
 *                     options: ["Low", "Medium", "High"]
 *                     required: true
 *     responses:
 *       201:
 *         description: Form created
 *
 *   get:
 *     summary: List custom forms
 *     tags: [Custom Forms]
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
 *               title: "IT Support Request Form"
 *               responseCount: 15
 */
router.post("/", validate(createCustomFormSchema), asyncHandler(CustomFormController.create));
router.get("/", validate(customFormListSchema), asyncHandler(CustomFormController.list));

/**
 * @openapi
 * /api/v1/custom-forms/{id}:
 *   get:
 *     summary: Get custom form
 *     tags: [Custom Forms]
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
 *           title: "IT Support Request Form"
 *           fields: []
 *
 *   put:
 *     summary: Update custom form
 *     tags: [Custom Forms]
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
 *               title: { type: string }
 *               fields:
 *                 type: array
 *                 items: {}
 *     responses:
 *       200:
 *         description: Form updated
 *
 *   delete:
 *     summary: Delete custom form
 *     tags: [Custom Forms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Form deleted
 */
router.get("/:id", asyncHandler(CustomFormController.getOne));
router.put("/:id", validate(updateCustomFormSchema), asyncHandler(CustomFormController.update));
router.delete("/:id", asyncHandler(CustomFormController.delete));

/**
 * @openapi
 * /api/v1/custom-forms/{id}/submit:
 *   post:
 *     summary: Submit a form response (authenticated)
 *     tags: [Custom Forms]
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
 *             properties:
 *               responses:
 *                 type: object
 *           example:
 *             responses:
 *               email: "user@university.edu"
 *               details: "I cannot access my email"
 *     responses:
 *       201:
 *         description: Response submitted
 *
 * /api/v1/custom-forms/{id}/duplicate:
 *   post:
 *     summary: Duplicate form to ticket
 *     tags: [Custom Forms, Tickets]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       201:
 *         description: Ticket created from form
 *
 * /api/v1/custom-forms/{id}/share-link:
 *   post:
 *     summary: Create a shareable link for the form
 *     tags: [Custom Forms]
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
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         example:
 *           token: "abc123share456"
 *           url: "http://localhost:3000/forms/abc123share456"
 *
 * /api/v1/custom-forms/{id}/responses:
 *   get:
 *     summary: Get form responses
 *     tags: [Custom Forms]
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
 *               responses:
 *                 email: "user@university.edu"
 *                 details: "Cannot access email"
 *               submittedAt: "2026-05-29T10:00:00.000Z"
 *
 * /api/v1/custom-forms/{id}/responses/export:
 *   get:
 *     summary: Export form responses (CSV)
 *     tags: [Custom Forms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: CSV file
 */
router.post("/:id/submit", asyncHandler(CustomFormController.submit));
router.post("/:id/duplicate", validate(duplicateCustomFormSchema), asyncHandler(CustomFormController.duplicateToTicket));
router.post("/:id/share-link", validate(createCustomFormShareLinkSchema), asyncHandler(CustomFormController.createShareLink));
router.get("/:id/responses", asyncHandler(CustomFormController.getResponses));
router.get("/:id/responses/export", asyncHandler(CustomFormController.exportResponses));

export default router;
