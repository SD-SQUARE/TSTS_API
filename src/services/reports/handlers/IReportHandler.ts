import { Report } from "../../../entities/Report.js";
import { Lang } from "../../../types/lang.types.js";
import { PeriodType, ReportTypes } from "../types/report.types.js";

export interface ViewReportParams {
  report: Report;
  filters: any;
  periodType?: PeriodType;
  language: Lang;
  page: number;
  limit: number;
  page_index?: number;
  page_count?: number;
}

export interface DownloadReportParams {
  report: Report;
  filters: any;
  type: ReportTypes;
  language: Lang;
  user: any;
  res: any;
}

export interface IReportHandler {
  /**
   * View report data (JSON response)
   */
  view(params: ViewReportParams): Promise<any>;

  /**
   * Download report (PDF/Excel)
   */
  download(params: DownloadReportParams): Promise<void>;
}
