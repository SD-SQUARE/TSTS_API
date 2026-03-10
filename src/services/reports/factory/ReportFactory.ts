import { IReportGenerator } from "../types/report.types.js";
import { SpecializationTicketsReportV1Generic } from "../specialization-tickets/v1.0/services/SpecializationTicketsReportV1Generic.js";
import { BaseReportConfig } from "../types/report.types.js";

export enum ReportType {
  SPECIALIZATION_TICKETS = "specialization-tickets",
  ATTENDANCE = "attendance",
  FINANCIAL = "financial",
}

export class ReportFactory {
  private static reportRegistry: Map<
    string,
    new (config: BaseReportConfig) => IReportGenerator
  > = new Map([
    ["specialization-tickets", SpecializationTicketsReportV1Generic],
    // Add more report types here
    // ['attendance', AttendanceReportV1Generic],
  ]);

  static createReport(
    reportType: ReportType | string,
    config: BaseReportConfig,
  ): IReportGenerator {
    const ReportClass = this.reportRegistry.get(reportType);

    if (!ReportClass) {
      throw new Error(`Report type "${reportType}" not found`);
    }

    return new ReportClass(config);
  }
}
