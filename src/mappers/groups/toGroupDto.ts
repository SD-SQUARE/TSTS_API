import { Group } from "../../entities/index.js";

export type GroupDto = {
  id: string;
  name: string;
  description: string;
  color: string | null;
};

export const toGroupDto = async (
  entity: Group,
  lang: "en" | "ar"
): Promise<GroupDto> => {
  return {
    id: entity.id,
    name: entity.name?.[lang] ?? "",
    description: entity.descriptions?.[lang] ?? "",
    color: entity.color ?? null,
  };
};
