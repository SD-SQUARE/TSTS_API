import { TicketActivityType } from "../enums/TicketActivity.enum.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";

export const mapStatusToActivityType = (toStatus: any): TicketActivityType => {
  let activityType = TicketActivityType.INFO;

  switch (toStatus) {
    case TicketStatus.IN_PROGRESS:
      activityType = TicketActivityType.IN_PROGRESS;
      break;
    case TicketStatus.CLOSED:
      activityType = TicketActivityType.CLOSED;
      break;
    case TicketStatus.RESOLVED:
      activityType = TicketActivityType.RESOLVED;
      break;
    case TicketStatus.PENDING:
      activityType = TicketActivityType.PENDING;
      break;
    case TicketStatus.REOPEN:
      activityType = TicketActivityType.REOPENED;
      break;
  }

  return activityType;
};

export const formatTicketStatus = (status: string): string => {
  if (!status) return status;

  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};
