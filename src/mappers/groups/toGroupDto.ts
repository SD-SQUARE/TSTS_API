import { Group } from "../../entities/index.js";

export type GroupDto = {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  color: string | null;
};

export const toGroupDto = async (
  entity: Group | null,
  lang: "en" | "ar"
): Promise<GroupDto | null> => {
  if (!entity) return null;

  return {
    id: entity.id,
    name_en: entity.name?.en ?? "",
    name_ar: entity.name?.ar ?? "",
    description_en: entity.descriptions?.en ?? "",
    description_ar: entity.descriptions?.ar ?? "",
    color: entity.color ?? null,
  };
};
