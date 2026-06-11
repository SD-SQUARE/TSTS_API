/**
 * Base Report Generators
 * Export all base classes and utilities for creating reports
 */

export { BaseReportGeneratorPuppeteer } from "./BaseReportGeneratorPuppeteer.js";
export {
  GenericReportGeneratorPuppeteer,
  type GenericReportConfig,
} from "./GenericReportGeneratorPuppeteer.js";
export {
  BASE_REPORT_STYLE_CONFIG,
  mergeReportStyleConfig,
  type ReportStyleConfig,
} from "./base.report.config.js";
