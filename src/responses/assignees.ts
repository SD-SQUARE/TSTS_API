import { buildFailResponse } from "../utils/buildFailResponse.js";

export const assigneeNotFound = <TFlag extends string>(
  flagKey: TFlag,
  assigneeId: string
) =>
  buildFailResponse(flagKey, "assignee_not_found", [
    { key: "assigneeList", message: `User ${assigneeId} does not exist` },
  ]);
