import { Request, Response } from "express";
import { ReportService } from "../services/report.service.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { Lang } from "../types/lang.types.js";
import { PeriodType, ReportTypes } from "../services/reports/index.js";
import { FilterUtils } from "../services/reports/utils/FilterUtils.js";
import logger from "../utils/logger.js";

export class ReportController {
  private reportService: ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  getAvailableReports = async (req: Request, res: Response) => {
    const { search } = req.query;
    const currentLang = (req.language || "en") as Lang;

    const reports = await this.reportService.getAvailableReports(
      search as string | undefined,
      currentLang,
    );

    res.status(ResponseStatus.SUCCESS).json(reports);
  };

  getDashboardStats = async (req: Request, res: Response) => {
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

      res.status(ResponseStatus.SUCCESS).json(stats);
    } catch (error: any) {
      res.status(ResponseStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: req.t("report_common.failed_to_fetch_dashboard_stats"),
        error: error.message,
      });
    }
  };

  /**
   * Generate or view report by ID
   * GET /reports/:reportId?startDate=...&endDate=...&filters=...&download=true&type=pdf&periodType=day/month/year&page=1&limit=10
   */
  generateReportById = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
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
        );

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
        res.json(result);
      }
    } catch (error: any) {
      this.handleReportError(error, res, req);
    }
  };

  private handleReportError(error: any, res: Response, req: Request) {
    if (error.message.includes("Invalid filters")) {
      return res
        .status(ResponseStatus.BAD_REQUEST)
        .json({ success: false, message: error.message });
    }

    if (error.message.includes("No data found")) {
      return res
        .status(ResponseStatus.NOT_FOUND)
        .json({ success: false, message: error.message });
    }

    res.status(ResponseStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: req.t("report_common.failed_to_generate_report"),
      error: error.message,
    });
  }
}
