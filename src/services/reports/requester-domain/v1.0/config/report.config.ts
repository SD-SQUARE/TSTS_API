import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

export const REQUESTER_DOMAIN_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.REQUESTER_DOMAIN,
  landscape: false,
  rowsPerPage: { en: 40, ar: 40 },
  indexColumnHeader: "#",
  indexColumnWidth: 50,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    requesterName: "requesterName",
    domain: "domain",
    ticketCount: "ticketCount",
  },
  columnWidths: {
    requesterName: 220,
    domain: 220,
    ticketCount: 100,
  },
  columnAlignments: {
    ticketCount: "center",
  },
};
