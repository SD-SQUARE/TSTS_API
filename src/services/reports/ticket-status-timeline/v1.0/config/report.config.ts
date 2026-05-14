import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

export const TICKET_STATUS_TIMELINE_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.TICKET_STATUS_TIMELINE,
  landscape: false,
  rowsPerPage: { en: 40, ar: 38 },
  indexColumnHeader: "#",
  indexColumnWidth: 35,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    ticketNumber: "ticketNumber",
    status: "status",
    changedAt: "changedAt",
    duration: "duration",
  },
  columnWidths: {
    ticketNumber: 100,
    status: 120,
    changedAt: 160,
    duration: 130,
  },
  columnAlignments: {
    ticketNumber: "center",
    status: "center",
    duration: "center",
  },
  styleConfig: {
    table: { cellPadding: "3px 4px" },
    fonts: { baseSize: { en: "9pt", ar: "8pt" } },
  },
};
