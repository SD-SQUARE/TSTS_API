import { IReportGenerator } from "../types/report.types.js";
import { SpecializationTicketsReportV1Generic } from "../specialization-tickets/v1.0/services/SpecializationTicketsReportV1Generic.js";
import { DomainDeptSpecProblemReportV1Generic } from "../domain-dept-spec-problem/v1.0/services/DomainDeptSpecProblemReportV1Generic.js";
import { BaseReportConfig } from "../types/report.types.js";

export enum ReportType {
  SPECIALIZATION_TICKETS = "specialization-tickets",
  DOMAIN_DEPT_SPEC_PROBLEM = "domain-dept-spec-problem",
  ATTENDANCE = "attendance",
  FINANCIAL = "financial",
}

export class ReportFactory {
  private static reportRegistry: Map<
    string,
    new (config: BaseReportConfig) => IReportGenerator
  > = new Map<string, new (config: BaseReportConfig) => IReportGenerator>([
    ["specialization-tickets", SpecializationTicketsReportV1Generic],
    ["domain-dept-spec-problem", DomainDeptSpecProblemReportV1Generic],
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
