import {
  IReportHandler,
  ViewReportParams,
  DownloadReportParams,
} from "../../../handlers/IReportHandler.js";
import { SpecializationTicketsCountPreparation } from "./SpecializationTicketsCountPreparation.js";
import { PeriodType, ReportTypes } from "../../../types/report.types.js";
import { Lang } from "../../../../../types/lang.types.js";
import { SpecializationTicketsReportPdf } from "./SpecializationTicketsReportPdf.js";
import { GenericTabularReportDownload } from "../../../utils/GenericTabularReportDownload.js";
import { SPECIALIZATION_TICKETS_REPORT_CONFIG } from "../config/report.config.js";

export class SpecializationTicketsReportHandler implements IReportHandler {
  async view(params: ViewReportParams): Promise<any> {
    const { report, filters, periodType, language, page, limit } = params;

    // Validate filters
    const validation =
      SpecializationTicketsCountPreparation.validateFilter(filters);
    if (!validation.isValid) {
      throw new Error(`Invalid filters: ${JSON.stringify(validation.errors)}`);
    }

    // Fetch data with pagination
    const data =
      await SpecializationTicketsCountPreparation.getSpecializationTicketsCountData(
        filters,
        language as Lang,
        true,
        page,
        limit,
      );

    // Get time-series statistics based on periodType
    const statistics =
      await SpecializationTicketsCountPreparation.getTimeSeriesStatistics(
        filters,
        periodType as PeriodType,
      );

    // Format columns from report metadata
    const columns = (report.columns || []).map((col) => ({
      key: col.key,
      label: col.label[language as Lang] || col.label.en || col.key,
    }));

    // Format all records (data has already been paginated)
    const allRecords = data.results.map((item, index) => ({
      index: index + 1 + (page - 1) * limit, // Adjust index for pagination
      specialization: item.specialization,
      ticketsCount: item.ticketsCount,
    }));

    // Build response
    return {
      id: report.id,
      title: report.title[language as Lang] || report.title.en || "",
      statistics: statistics,
      filters: (report.filters || []).map((f) => f.column),
      columns: [{ key: "index", label: "#" }, ...columns],
      records: allRecords,
      meta: {
        page_size: Number(limit ?? 1),
        page_index: Number(page ?? 1),
        total: data.totalItems,
        total_pages: data.totalPages,
      },
    };
  }

  async download(params: DownloadReportParams): Promise<void> {
    const { type, report, filters, language, user, res } = params;

    if (type === ReportTypes.PDF) {
      return new SpecializationTicketsReportPdf().downloadPDF(params);
    }
    if (type === ReportTypes.EXCEL) {
      const filteredData = await SpecializationTicketsCountPreparation.getSpecializationTicketsCountData(filters, language as Lang, false);
      const records = filteredData.results.map((item, i) => ({
        index: i + 1,
        specialization: item.specialization,
        ticketsCount: item.ticketsCount,
      }));
      return GenericTabularReportDownload.downloadExcel({ report, records, type, language, user, res, filters, reportConfig: SPECIALIZATION_TICKETS_REPORT_CONFIG });
    }
    throw new Error(`Unsupported report type: ${type}`);
  }
}
