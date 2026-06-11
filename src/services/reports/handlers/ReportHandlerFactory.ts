import { IReportHandler } from "./IReportHandler.js";
import { SpecializationTicketsReportHandler } from "../specialization-tickets/v1.0/services/SpecializationTicketsReportHandler.js";
import { DomainDeptSpecProblemReportHandler } from "../domain-dept-spec-problem/v1.0/services/DomainDeptSpecProblemReportHandler.js";
import { RequesterDomainReportHandler } from "../requester-domain/v1.0/services/RequesterDomainReportHandler.js";
import { TicketStatusTimelineReportHandler } from "../ticket-status-timeline/v1.0/services/TicketStatusTimelineReportHandler.js";
import { TechnicianPerformanceReportHandler } from "../technician-performance/v1.0/services/TechnicianPerformanceReportHandler.js";
import { SlaComplianceReportHandler } from "../sla-compliance/v1.0/services/SlaComplianceReportHandler.js";
import { PriorityDistributionReportHandler } from "../priority-distribution/v1.0/services/PriorityDistributionReportHandler.js";
import { DepartmentWorkloadReportHandler } from "../department-workload/v1.0/services/DepartmentWorkloadReportHandler.js";
import { ReportHandler } from "../../../enums/ReportHandler.enum.js";

export class ReportHandlerFactory {
  private static handlers: Map<string, new () => IReportHandler> = new Map([
    [ReportHandler.SPECIALIZATION_TICKETS_COUNT, SpecializationTicketsReportHandler],
    [ReportHandler.DOMAIN_DEPT_SPEC_PROBLEM, DomainDeptSpecProblemReportHandler],
    [ReportHandler.REQUESTER_DOMAIN, RequesterDomainReportHandler],
    [ReportHandler.TICKET_STATUS_TIMELINE, TicketStatusTimelineReportHandler],
    [ReportHandler.TECHNICIAN_PERFORMANCE, TechnicianPerformanceReportHandler],
    [ReportHandler.SLA_COMPLIANCE, SlaComplianceReportHandler],
    [ReportHandler.PRIORITY_DISTRIBUTION, PriorityDistributionReportHandler],
    [ReportHandler.DEPARTMENT_WORKLOAD, DepartmentWorkloadReportHandler],
  ]);

  static createHandler(handlerType: string): IReportHandler {
    const HandlerClass = this.handlers.get(handlerType);

    if (!HandlerClass) {
      throw new Error(
        `Report handler not found for type: ${handlerType}. Available handlers: ${Array.from(
          this.handlers.keys(),
        ).join(", ")}`,
      );
    }

    return new HandlerClass();
  }

  static hasHandler(handlerType: string): boolean {
    return this.handlers.has(handlerType);
  }

  static getAvailableHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}
