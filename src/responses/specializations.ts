import { buildFailResponse } from "../utils/buildFailResponse.js";

export const specializationNotFound = <TFlag extends string>(flagKey: TFlag) =>
  buildFailResponse(flagKey, "specialization_not_found", [
    { key: "specialization", message: "Specialization does not exist" },
  ]);
