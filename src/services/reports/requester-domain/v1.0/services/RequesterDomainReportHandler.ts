import { IReportHandler, ViewReportParams, DownloadReportParams } from "../../../handlers/IReportHandler.js";
import { RequesterDomainPreparation } from "./RequesterDomainPreparation.js";
import { Lang } from "../../../../../types/lang.types.js";
import { ReportTypes } from "../../../types/report.types.js";
import { RequesterDomainReportPdf } from "./RequesterDomainReportPdf.js";

export class RequesterDomainReportHandler implements IReportHandler {
  async view(params: ViewReportParams): Promise<any> {
    const { report, filters, language, page, limit } = params;

    const validation = RequesterDomainPreparation.validateFilter(filters, language as Lang);
    if (!validation.isValid) {
      throw new Error(`Invalid filters: ${JSON.stringify(validation.errors)}`);
    }

    const data = await RequesterDomainPreparation.getData(
      filters,
      language as Lang,
      true,
      page,
      limit,
    );

    const columns = (report.columns || []).map((col) => ({
      key: col.key,
      label: col.label[language as Lang] || col.label.en || col.key,
    }));

    const records = data.results.map((item, index) => ({
      index: index + 1 + (page - 1) * limit,
      requesterName: item.requesterName,
      domain: item.domain,
      ticketCount: item.ticketCount,
    }));

    return {
      id: report.id,
      title: report.title[language as Lang] || report.title.en || "",
      columns: [{ key: "index", label: "#" }, ...columns],
      filters: (report.filters || []).map((f) => f.column),
      records,
      meta: {
        page_size: Number(limit),
        page_index: Number(page),
        total: data.totalItems,
        total_pages: data.totalPages,
      },
    };
  }

  async download(params: DownloadReportParams): Promise<void> {
    const { type } = params;
    if (type === ReportTypes.PDF) {
      return new RequesterDomainReportPdf().downloadPDF(params);
    }
    throw new Error(`Unsupported report type: ${type}. Supported types: pdf`);
  }
}
