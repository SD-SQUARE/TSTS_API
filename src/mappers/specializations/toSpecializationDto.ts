import { Specialization } from "../../entities/Specialization.js";

export type SpecializationDto = {
  id: string;
  name: string;
  description: string;
};

export const toSpecializationDto = (
  entity: Specialization,
  lang: "en" | "ar"
): SpecializationDto => {
  return {
    id: entity.id,
    name: entity.name?.[lang] ?? "",
    description: entity.description?.[lang] ?? "",
  };
};
