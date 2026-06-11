import { Request, Response } from "express";
import { ReportService } from "../services/report.service.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { Lang } from "../types/lang.types.js";
import { PeriodType, ReportTypes } from "../services/reports/index.js";
import { FilterUtils } from "../services/reports/utils/FilterUtils.js";
import logger from "../utils/logger.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";
import { DashboardAnalyticsService } from "../services/dashboard-analytics.service.js";

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  getAvailableReports = async (req: Request, res: Response) => {
    const { search } = req.query;
    const currentLang = (req.language || "en") as Lang;

    const auditLog = audit(req)
      .summary("Fetch available reports")
      .action(AuditAction.GET_AVAILABLE_REPORTS)
      .resource("Report", "all")
      .metadata({ search: search || null });

    const reports = await this.reportService.getAvailableReports(
      search as string | undefined,
      currentLang,
    );

    auditLog
      .metadata({ total_reports: reports.length })
      .step("Reports fetched successfully");

    res.status(ResponseStatus.SUCCESS).json(reports);
  };

  getDashboardStats = async (req: Request, res: Response) => {
    const auditLog = audit(req)
      .summary("Fetch dashboard statistics")
      .action(AuditAction.GET_DASHBOARD_STATS)
      .resource("Dashboard", "overall")
      .metadata({ query: req.query });

    try {
      const { startDate, endDate, periodType } = req.query;
      const currentLang = (req.language || "en") as Lang;

      // Trim periodType if it exists
      const cleanPeriodType =
        typeof periodType === "string" ? periodType.trim() : periodType;

      const stats = await this.reportService.getDashboardStatistics(
        startDate as string | undefined,
        endDate as string | undefined,
        ((cleanPeriodType as string) || "year") as PeriodType,
        currentLang,
      );

      auditLog
        .metadata({ totalSpecializations: stats.length })
        .step("Dashboard statistics fetched successfully");

      res.status(ResponseStatus.SUCCESS).json(stats);
    } catch (error: any) {
      auditLog
        .metadata({ error: error.message })
        .step("Failed to fetch dashboard statistics");
      res.status(ResponseStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: req.t("report_common.failed_to_fetch_dashboard_stats"),
        error: error.message,
      });
    }
  };

  getDashboardAnalytics = async (req: Request, res: Response) => {
    const auditLog = audit(req)
      .summary("Fetch dashboard analytics")
      .action(AuditAction.GET_DASHBOARD_STATS)
      .resource("Dashboard", "analytics")
      .metadata({ query: req.query });

    try {
      const { startDate, endDate } = req.query;

      const analytics = await DashboardAnalyticsService.getDashboardAnalytics(
        startDate as string | undefined,
        endDate as string | undefined,
      );

      auditLog
        .metadata({ totalTickets: analytics.totalTickets })
        .step("Dashboard analytics fetched successfully");

      res.status(ResponseStatus.SUCCESS).json(analytics);
    } catch (error: any) {
      auditLog
        .metadata({ error: error.message })
        .step("Failed to fetch dashboard analytics");
      res.status(ResponseStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: req.t("report_common.failed_to_fetch_dashboard_analytics"),
        error: error.message,
      });
    }
  };

  /**
   * Generate or view report by ID
   * GET /reports/:reportId?startDate=...&endDate=...&filters=...&download=true&type=pdf&periodType=day/month/year&page=1&limit=10
   */
  generateReportById = async (req: Request, res: Response) => {
    const auditLog = audit(req)
      .summary("Generate report by ID")
      .action(AuditAction.GENERATE_REPORT)
      .resource("Report", req.params.reportId)
      .metadata({ query: req.query });

    try {
      const user = (req as any).user;
      if (!user) {
        auditLog.step("Unauthorized attempt to generate report");
        return res.status(ResponseStatus.UNAUTHORIZED).json({
          success: false,
          message: req.t("report_common.authentication_required"),
        });
      }

      const { reportId } = req.params;
      const {
        startDate,
        endDate,
        filters,
        download,
        type,
        periodType,
        page_index,
        page_size,
      } = req.query;

      const report = await this.reportService.getReportById(reportId);
      if (!report) {
        auditLog.step("Report not found");
        return res.status(ResponseStatus.NOT_FOUND).json({
          success: false,
          message: req.t("report_common.report_not_found"),
        });
      }

      const currentLang = (req.language || "en") as Lang;
      const isDownload = download === "true" || download === "1";

      // Parse filters - Zod validates but doesn't mutate req.query
      let parsedFilters: any[] = [];
      if (filters && typeof filters === "string" && filters.trim() !== "") {
        parsedFilters = JSON.parse(filters);
      }

      // Group filters by column for easier processing
      const groupedFilters =
        Array.isArray(parsedFilters) && parsedFilters.length > 0
          ? FilterUtils.groupFiltersByColumn(parsedFilters)
          : {};

      const filterObject = {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        groupedFilters:
          Object.keys(groupedFilters).length > 0 ? groupedFilters : undefined,
      };

      if (isDownload) {
        const reportType = ((type as string) || "pdf") as ReportTypes;

        logger.info(
          `[report-controller] Generating ZIP with type: ${reportType}`,
        );

        // Stream zip directly to response (like bulkUploadRequesters)
        await this.reportService.streamReportZip(
          report,
          filterObject,
          [reportType],
          currentLang,
          user,
          res,
          req,
        );

        auditLog.step("Report ZIP streamed successfully");
        return; // ⛔ ABSOLUTELY REQUIRED
      } else {
        // Trim periodType if it exists
        const cleanPeriodType =
          typeof periodType === "string" ? periodType.trim() : periodType;

        const result = await this.reportService.viewReport(
          report,
          filterObject,
          ((cleanPeriodType as string) || "month") as PeriodType,
          currentLang,
          (page_index as unknown as number) || 1,
          (page_size as unknown as number) || 10,
        );

        auditLog
          .metadata({ totalRows: result?.length || 0 })
          .step("Report viewed successfully");
        res.json(result);
      }
    } catch (error: any) {
      auditLog
        .metadata({ error: error.message })
        .step("Failed to generate report");
      this.handleReportError(error, res, req);
    }
  };

  private handleReportError(error: any, res: Response, req: Request) {
    const auditLog = audit(req);
    auditLog
      .summary("Report generation failed")
      .action(AuditAction.GENERATE_REPORT)
      .metadata({ error: error.message })
      .step("Report generation error");

    if (error.message.includes("Invalid filters")) {
      auditLog.step("Invalid filters detected");
      return res
        .status(ResponseStatus.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    if (error.message.includes("No data found")) {
      auditLog.step("No data found for report");
      return res
        .status(ResponseStatus.NOT_FOUND)
        .json({ success: false, message: error.message });
    }

    auditLog.step("Internal server error while generating report");
    res.status(ResponseStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: req.t("report_common.failed_to_generate_report"),
      error: error.message,
    });
  }
}
