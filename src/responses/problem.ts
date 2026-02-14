import { buildFailResponse } from "../utils/buildFailResponse.js";

export const problemNotFound = <TFlag extends string>(flagKey: TFlag) =>
  buildFailResponse(flagKey, "problem_not_found", [
    { key: "problem", message: "problem does not exist" },
  ]);
