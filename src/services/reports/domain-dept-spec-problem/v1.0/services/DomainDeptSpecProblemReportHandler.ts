import {
  IReportHandler,
  ViewReportParams,
  DownloadReportParams,
} from "../../../handlers/IReportHandler.js";
import { DomainDeptSpecProblemPreparation } from "./DomainDeptSpecProblemPreparation.js";
import { Lang } from "../../../../../types/lang.types.js";
import { ReportTypes } from "../../../types/report.types.js";
import { DomainDeptSpecProblemReportPdf } from "./DomainDeptSpecProblemReportPdf.js";

export class DomainDeptSpecProblemReportHandler implements IReportHandler {
  async view(params: ViewReportParams): Promise<any> {
    const { report, filters, language, page, limit } = params;

    // Validate filters
    const validation = DomainDeptSpecProblemPreparation.validateFilter(
      filters,
      language as Lang,
    );
    if (!validation.isValid) {
      throw new Error(`Invalid filters: ${JSON.stringify(validation.errors)}`);
    }

    // Fetch data with pagination
    const data =
      await DomainDeptSpecProblemPreparation.getDomainDeptSpecProblemData(
        filters,
        language as Lang,
        true,
        page,
        limit,
      );

    // Format columns from report metadata
    const columns = (report.columns || []).map((col) => ({
      key: col.key,
      label: col.label[language as Lang] || col.label.en || col.key,
    }));

    // Format all records (data has already been paginated)
    const allRecords = data.results.map((item, index) => ({
      index: index + 1 + (page - 1) * limit,
      domain: item.domain,
      department: item.department,
      specialization: item.specialization,
      problem: item.problem,
      ticketCount: item.ticketCount,
    }));

    // Build response
    return {
      id: report.id,
      title: report.title[language as Lang] || report.title.en || "",
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
      return new DomainDeptSpecProblemReportPdf().downloadPDF(params);
    } else {
      throw new Error(`Unsupported report type: ${type}. Supported types: pdf`);
    }
  }
}
