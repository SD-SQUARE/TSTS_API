import { ReportHandler } from "../../../../../enums/ReportHandler.enum.js";
import { GenericReportConfig } from "../../../base/GenericReportGeneratorPuppeteer.js";

export const DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG: GenericReportConfig = {
  reportHandler: ReportHandler.DOMAIN_DEPT_SPEC_PROBLEM,
  landscape: true,
  rowsPerPage: {
    en: 25,
    ar: 25,
  },
  indexColumnHeader: "#",
  indexColumnWidth: 50,
  indexStartOffset: 1,
  showIndex: true,
  columnMappings: {
    domain: "domain",
    department: "department",
    specialization: "specialization",
    problem: "problem",
    ticketCount: "ticketCount",
  },
  columnWidths: {
    domain: 200,
    department: 180,
    specialization: 160,
    problem: 160,
    ticketCount: 100,
  },
  columnAlignments: {
    ticketCount: "center",
  },
  // Custom styling - overrides base config
  styleConfig: {
    table: {
      cellPadding: "3px 4px",
      headerBackgroundColor: "#f5f5f5",
    },
    fonts: {
      baseSize: {
        en: "10pt",
        ar: "8pt",
      },
    },
  },
};

export default DOMAIN_DEPT_SPEC_PROBLEM_REPORT_CONFIG;
