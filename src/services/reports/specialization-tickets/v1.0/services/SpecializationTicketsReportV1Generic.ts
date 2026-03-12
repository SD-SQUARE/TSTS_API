import { GenericReportGeneratorPuppeteer } from "../../../base/GenericReportGeneratorPuppeteer.js";
import { BaseReportConfig } from "../../../types/report.types.js";
import { SPECIALIZATION_TICKETS_REPORT_CONFIG } from "../config/report.config.js";

export class SpecializationTicketsReportV1Generic extends GenericReportGeneratorPuppeteer {
  constructor(config: BaseReportConfig) {
    super(config, SPECIALIZATION_TICKETS_REPORT_CONFIG);
  }
}
