import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

/**
 * Generic report configuration for Specialization Tickets Report
 * Used with GenericReportGeneratorPuppeteer
 */
export const SPECIALIZATION_TICKETS_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.SPECIALIZATION_TICKETS_COUNT,
  rowsPerPage: {
    en: 43,
    ar: 41,
  },
  indexColumnHeader: "#",
  indexColumnWidth: 60,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    specialization: "specialization",
    ticketsCount: "ticketsCount",
  },
  columnWidths: {
    ticketsCount: 160, // Set width for tickets count column
  },
  columnAlignments: {
    ticketsCount: "center", // Center align tickets count
  },
  // Custom styling - overrides base config
  styleConfig: {
    table: {
      cellPadding: "2px 2px", // More padding than default
      headerBackgroundColor: "#f9f9f9", // Custom header color
    },
    page: {
      padding: "0 20px",
    },
    // Other style properties use base config defaults
  },
};

export default SPECIALIZATION_TICKETS_REPORT_CONFIG;
