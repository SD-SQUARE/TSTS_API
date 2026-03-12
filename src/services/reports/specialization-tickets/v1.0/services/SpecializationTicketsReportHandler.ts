import {
  IReportHandler,
  ViewReportParams,
  DownloadReportParams,
} from "../../../handlers/IReportHandler.js";
import { SpecializationTicketsCountPreparation } from "./SpecializationTicketsCountPreparation.js";
import { PeriodType, ReportTypes } from "../../../types/report.types.js";
import { Lang } from "../../../../../types/lang.types.js";
import { SpecializationTicketsReportPdf } from "./SpecializationTicketsReportPdf.js";

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
    const { type } = params;

    if (type === ReportTypes.PDF) {
      return new SpecializationTicketsReportPdf().downloadPDF(params);
    } else {
      throw new Error(`Unsupported report type: ${type}. Supported types: pdf`);
    }
  }
}
