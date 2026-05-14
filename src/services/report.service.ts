import { Repository } from "typeorm";
import { Report } from "../entities/Report.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Lang } from "../types/lang.types.js";
import { ReportHandlerFactory } from "./reports/handlers/ReportHandlerFactory.js";
import { PeriodType, ReportTypes } from "./reports/types/report.types.js";
import { audit } from "../helpers/auditBuilder.js";
import { Request } from "express";
import { AuditAction } from "../enums/AuditAction.enum.js";

export class ReportService {
  private reportRepo: Repository<Report>;

  constructor() {
    this.reportRepo = PostgresDataSource.getRepository(Report);
  }

  async getAvailableReports(
    search?: string,
    language: Lang = "en",
  ): Promise<Array<{ id: string; title: string; description: string }>> {
    const qb = this.reportRepo
      .createQueryBuilder("report")
      .select(["report.id", "report.title", "report.description"]);

    // 🔍 Full-text search on title and description with ILIKE fallback
    if (search?.trim()) {
      qb.andWhere(
        `(
          report.searchVector @@ websearch_to_tsquery('english', :search)
          OR report.title->>'en' ILIKE :like
          OR report.title->>'ar' ILIKE :like
          OR report.description->>'en' ILIKE :like
          OR report.description->>'ar' ILIKE :like
        )`,
        {
          search: search,
          like: `%${search}%`,
        },
      );
    }

    const reports = await qb.getMany();

    return reports.map((report) => ({
      id: report.id,
      title: report.title[language] || report.title.en || "",
      description:
        report.description?.[language] || report.description?.en || "",
    }));
  }

  async getReportById(reportId: string): Promise<Report | null> {
    return this.reportRepo.findOne({
      where: { id: reportId },
    });
  }

  async getReportByHandler(handler: string): Promise<Report | null> {
    return this.reportRepo.findOne({
      where: { handler: handler },
    });
  }

  /**
   * Get dashboard statistics for all specializations
   * Uses a single efficient query instead of N+1 queries
   */
  async getDashboardStatistics(
    startDate?: string,
    endDate?: string,
    periodType: PeriodType = PeriodType.YEAR,
    language: Lang = "en",
  ): Promise<
    Array<{
      ticketType: string;
      statistics: Array<{ period: string; value: number }>;
    }>
  > {
    let dateFormat: string;
    switch (periodType) {
      case PeriodType.DAY: dateFormat = "YYYY-MM-DD"; break;
      case PeriodType.MONTH: dateFormat = "YYYY-MM"; break;
      default: dateFormat = "YYYY";
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (startDate) {
      conditions.push(`t."createdAt" >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`t."createdAt" <= $${idx++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Single query: get ticket counts per specialization per period
    const rows = await PostgresDataSource.query(`
      SELECT
        s.name as spec_name,
        TO_CHAR(t."createdAt", '${dateFormat}') as period,
        COUNT(t.id) as value
      FROM tickets t
      INNER JOIN specializations s ON t."specializationId" = s.id
      ${whereClause}
      GROUP BY s.id, s.name, period
      ORDER BY period ASC
    `, params);

    // Group by specialization
    const specMap = new Map<string, Array<{ period: string; value: number }>>();

    for (const row of rows) {
      const specName = row.spec_name?.[language] || row.spec_name?.en || row.spec_name?.ar || "Unknown";
      if (!specMap.has(specName)) {
        specMap.set(specName, []);
      }
      specMap.get(specName)!.push({
        period: row.period,
        value: parseInt(row.value, 10),
      });
    }

    // Convert to array, only include specializations with data
    return Array.from(specMap.entries()).map(([ticketType, statistics]) => ({
      ticketType,
      statistics,
    }));
  }

  /**
   * View report data (JSON response)
   */
  async viewReport(
    report: Report,
    filters: any,
    periodType: PeriodType | undefined,
    currentLang: Lang,
    page: number,
    limit: number,
  ): Promise<any> {
    const handler = ReportHandlerFactory.createHandler(report.handler);
    return handler.view({
      report,
      filters,
      periodType,
      language: currentLang,
      page,
      limit,
    });
  }

  /**
   * Download report (PDF/Excel) - streams directly to response
   */
  async downloadReport(
    report: Report,
    filters: any,
    type: ReportTypes,
    currentLang: Lang,
    user: any,
    res: any,
  ): Promise<void> {
    const handler = ReportHandlerFactory.createHandler(report.handler);
    return handler.download({
      report,
      filters,
      type,
      language: currentLang,
      user,
      res,
    });
  }

  /**
   * Generate report as buffer (for zip generation)
   */
  async generateReportBuffer(
    report: Report,
    filters: any,
    type: ReportTypes,
    currentLang: Lang,
    user: any,
  ): Promise<Buffer> {
    // Create a mock response object to capture the buffer
    const mockRes = {
      setHeader: () => {},
      write: (chunk: any) => {
        if (!mockRes.buffer) {
          mockRes.buffer = [];
        }
        mockRes.buffer.push(chunk);
      },
      send: (data: any) => {
        if (!mockRes.buffer) {
          mockRes.buffer = [];
        }
        mockRes.buffer.push(data);
      },
      end: (chunk?: any) => {
        if (chunk) {
          if (!mockRes.buffer) {
            mockRes.buffer = [];
          }
          mockRes.buffer.push(chunk);
        }
      },
      buffer: [] as any[],
    };

    // Generate the report
    await this.downloadReport(
      report,
      filters,
      type,
      currentLang,
      user,
      mockRes as any,
    );

    // Combine buffer chunks
    return Buffer.concat(
      mockRes.buffer.map((chunk) =>
        Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
      ),
    );
  }

  /**
   * Stream report zip file directly to response
   */
  async streamReportZip(
    report: Report,
    filters: any,
    types: ReportTypes[],
    currentLang: Lang,
    user: any,
    res: any,
    req?: Request,
  ): Promise<void> {
    const archiver = (await import("archiver")).default;
    const logger = (await import("../utils/logger.js")).default;

    const auditLog = req ? audit(req)
    .summary("Stream report ZIP")
    .action(AuditAction.DOWNLOAD_REPORT)
    .resource("Report", report.id)
    .metadata({ userId: user.id, filters, types, language: currentLang }) : null;

    logger.info(
      `[report-zip] Generating ZIP for report: ${report.id} with types: ${types.join(", ")}`,
    );
     auditLog?.step("ZIP generation started");

    // Set response headers
    res.status(200);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${report.handler}-${Date.now()}.zip"`,
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Encoding", "identity");
    res.flushHeaders();

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      logger.error("[report-zip] ZIP error:", err);
      auditLog?.metadata({ error: err.message }).step("ZIP generation failed");
      res.end(); // ⛔ do NOT throw
    });

    archive.pipe(res);

    // Generate reports for each type
    for (const reportType of types) {
      try {
        logger.info(`[report-zip] Generating ${reportType} report`);

        const reportBuffer = await this.generateReportBuffer(
          report,
          filters,
          reportType,
          currentLang,
          user,
        );

        // Determine file extension
        const extension = reportType === ReportTypes.PDF ? "pdf" : "xlsx";
        const filename = `report-${report.handler}-${Date.now()}.${extension}`;

        // Add report file to archive
        archive.append(reportBuffer, { name: filename });
         auditLog?.step(`Added ${reportType} report to ZIP`);
        logger.info(
          `[report-zip] Added ${reportType} report to ZIP: ${filename}`,
        );
      } catch (error: any) {
        logger.error(
          `[report-zip] Error generating ${reportType} report:`,
          error,
        );
        // Add error file to zip instead of failing completely
        archive.append(
          JSON.stringify(
            {
              error: `Failed to generate ${reportType} report`,
              message: error.message,
            },
            null,
            2,
          ),
          { name: `error-${reportType}.json` },
        );
        auditLog?.metadata({ [`error_${reportType}`]: error.message }).step(
        `Failed to generate ${reportType} report`,
      );
      }
    }

    // Add metadata JSON
    const metadata = {
      reportId: report.id,
      reportTitle: report.title[currentLang] || report.title.en || "Report",
      generatedAt: new Date().toISOString(),
      filters: filters,
      types: types,
      language: currentLang,
    };

    archive.append(JSON.stringify(metadata, null, 2), {
      name: "report_metadata.json",
    });
     auditLog?.step("Added metadata to ZIP");

    await archive.finalize();
    logger.info(
      `[report-zip] ZIP generated successfully for report: ${report.id}`,
    );
    auditLog?.step("ZIP generation completed successfully");

    return; // ⛔ ABSOLUTELY REQUIRED
  }
}
