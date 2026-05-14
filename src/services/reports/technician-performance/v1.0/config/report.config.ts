import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

export const TECHNICIAN_PERFORMANCE_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.TECHNICIAN_PERFORMANCE,
  landscape: false,
  rowsPerPage: { en: 40, ar: 38 },
  indexColumnHeader: "#",
  indexColumnWidth: 35,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    technicianName: "technicianName",
    assignedTickets: "assignedTickets",
    resolvedTickets: "resolvedTickets",
    avgResolutionTime: "avgResolutionTime",
    resolutionRate: "resolutionRate",
  },
  columnWidths: {
    technicianName: 200,
    assignedTickets: 90,
    resolvedTickets: 90,
    avgResolutionTime: 130,
    resolutionRate: 100,
  },
  columnAlignments: {
    assignedTickets: "center",
    resolvedTickets: "center",
    avgResolutionTime: "center",
    resolutionRate: "center",
  },
  styleConfig: {
    table: { cellPadding: "3px 4px" },
    fonts: { baseSize: { en: "9pt", ar: "8pt" } },
  },
};
