import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

export const PRIORITY_DISTRIBUTION_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.PRIORITY_DISTRIBUTION,
  landscape: false,
  rowsPerPage: { en: 42, ar: 40 },
  indexColumnHeader: "#",
  indexColumnWidth: 35,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    priority: "priority",
    ticketCount: "ticketCount",
    avgResolutionTime: "avgResolutionTime",
    percentage: "percentage",
  },
  columnWidths: {
    priority: 180,
    ticketCount: 100,
    avgResolutionTime: 160,
    percentage: 100,
  },
  columnAlignments: {
    ticketCount: "center",
    avgResolutionTime: "center",
    percentage: "center",
  },
  styleConfig: {
    table: { cellPadding: "3px 4px" },
    fonts: { baseSize: { en: "9pt", ar: "8pt" } },
  },
};
