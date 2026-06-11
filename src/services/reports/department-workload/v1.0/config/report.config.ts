import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

export const DEPARTMENT_WORKLOAD_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.DEPARTMENT_WORKLOAD,
  landscape: false,
  rowsPerPage: { en: 40, ar: 38 },
  indexColumnHeader: "#",
  indexColumnWidth: 35,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    department: "department",
    openTickets: "openTickets",
    inProgressTickets: "inProgressTickets",
    resolvedTickets: "resolvedTickets",
    avgHandlingTime: "avgHandlingTime",
  },
  columnWidths: {
    department: 220,
    openTickets: 80,
    inProgressTickets: 90,
    resolvedTickets: 80,
    avgHandlingTime: 130,
  },
  columnAlignments: {
    openTickets: "center",
    inProgressTickets: "center",
    resolvedTickets: "center",
    avgHandlingTime: "center",
  },
  styleConfig: {
    table: { cellPadding: "3px 4px" },
    fonts: { baseSize: { en: "9pt", ar: "8pt" } },
  },
};
