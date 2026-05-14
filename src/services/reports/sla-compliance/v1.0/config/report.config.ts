import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

export const SLA_COMPLIANCE_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.SLA_COMPLIANCE,
  landscape: false,
  rowsPerPage: { en: 40, ar: 38 },
  indexColumnHeader: "#",
  indexColumnWidth: 35,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    specialization: "specialization",
    totalTickets: "totalTickets",
    resolvedTickets: "resolvedTickets",
    activeTickets: "activeTickets",
    avgResolutionTime: "avgResolutionTime",
  },
  columnWidths: {
    specialization: 220,
    totalTickets: 80,
    resolvedTickets: 90,
    activeTickets: 80,
    avgResolutionTime: 130,
  },
  columnAlignments: {
    totalTickets: "center",
    resolvedTickets: "center",
    activeTickets: "center",
    avgResolutionTime: "center",
  },
  styleConfig: {
    table: { cellPadding: "3px 4px" },
    fonts: { baseSize: { en: "9pt", ar: "8pt" } },
  },
};
