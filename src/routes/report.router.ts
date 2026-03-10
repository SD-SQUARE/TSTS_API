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

// Apply authentication to all report routes
router.use(authMiddleware);

// Get dashboard statistics
router.get(
  "/dashboard",
  validate(getDashboardStatsSchema),
  asyncHandler(reportController.getDashboardStats),
);

// Get available reports with search
router.get(
  "/",
  validate(getAvailableReportsSchema),
  asyncHandler(reportController.getAvailableReports),
);

// Generate or view report by ID (dynamic)
router.get(
  "/:reportId",
  validate(generateReportByIdSchema),
  asyncHandler(reportController.generateReportById),
);

export default router;
