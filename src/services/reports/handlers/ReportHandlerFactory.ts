import { IReportHandler } from "./IReportHandler.js";
import { SpecializationTicketsReportHandler } from "../specialization-tickets/v1.0/services/SpecializationTicketsReportHandler.js";
import { ReportHandler } from "../../../enums/ReportHandler.enum.js";

export class ReportHandlerFactory {
  private static handlers: Map<string, new () => IReportHandler> = new Map([
    [
      ReportHandler.SPECIALIZATION_TICKETS_COUNT,
      SpecializationTicketsReportHandler,
    ],
    // Add more report handlers here as needed
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
