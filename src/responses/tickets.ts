import { buildFailResponse } from "../utils/buildFailResponse.js";

/** Generic "not found" helpers using the builder works for create, edit and delete*/
export const ticketNotFound = <TFlag extends string>(
  flagKey: TFlag,
  ticketId: string
) =>
  buildFailResponse(flagKey, "ticket_not_found", [
    { key: "ticketId", message: "Ticket does not exist" },
  ]);
