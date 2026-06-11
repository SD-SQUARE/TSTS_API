import { Router } from "express";
import { ReportController } from "../controllers/report.controller.js";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../validation/zod-middleware.js";
import {
    getAvailableReportsSchema,
    generateReportByIdSchema,
    getDashboardStatsSchema,
} from "../validation/report.schema.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const reportController = new ReportController();

router.use(authMiddleware);

/**
 * @openapi
 * /api/v1/reports/dashboard/analytics:
 *   get:
 *     summary: Get dashboard analytics
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         example:
 *           totalTickets: 500
 *           openTickets: 45
 *           avgResolutionHours: 8.5
 *           satisfactionRate: 92.5
 *
 * /api/v1/reports/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         example:
 *           ticketsByStatus:
 *             Open: 45
 *             InProgress: 55
 *             Resolved: 250
 *             Closed: 150
 *           ticketsByPriority:
 *             Low: 200
 *             Medium: 180
 *             High: 100
 *             Critical: 20
 */
router.get("/dashboard/analytics", asyncHandler(reportController.getDashboardAnalytics));
router.get("/dashboard", validate(getDashboardStatsSchema), asyncHandler(reportController.getDashboardStats));

/**
 * @openapi
 * /api/v1/reports:
 *   get:
 *     summary: Get available reports
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         example:
 *           data:
 *             - id: "tickets_summary"
 *               name: "Tickets Summary"
 *               description: "Overview of ticket metrics"
 *
 * /api/v1/reports/{reportId}:
 *   get:
 *     summary: Generate report by ID
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema: { type: string }
 *         example: "tickets_summary"
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, pdf, csv], default: "json" }
 *       - in: query
 *         name: fromDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: toDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Report data (or file for pdf/csv)
 */
router.get("/", validate(getAvailableReportsSchema), asyncHandler(reportController.getAvailableReports));
router.get("/:reportId", validate(generateReportByIdSchema), asyncHandler(reportController.generateReportById));

export default router;
