import { PostgresDataSource } from "../../database/postgres-data-source.js";
import { GroupHead } from "../../entities/GroupHead.js";
import { TeamLead } from "../../entities/TeamLead.js";

export const getManagedGroupSpecializationIds = async (
  userId: string,
): Promise<string[]> => {
  const headRows = await PostgresDataSource.getRepository(GroupHead)
    .createQueryBuilder("groupHead")
    .innerJoin("groupHead.group", "group")
    .innerJoin("group.specializations", "groupSpecialization")
    .innerJoin("groupSpecialization.specialization", "specialization")
    .select("specialization.id", "specializationId")
    .where("groupHead.user = :userId", { userId })
    .getRawMany<{ specializationId: string }>();

  const leadRows = await PostgresDataSource.getRepository(TeamLead)
    .createQueryBuilder("teamLead")
    .innerJoin("teamLead.team", "team")
    .innerJoin("team.group", "group")
    .innerJoin("group.specializations", "groupSpecialization")
    .innerJoin("groupSpecialization.specialization", "specialization")
    .select("specialization.id", "specializationId")
    .where("teamLead.user = :userId", { userId })
    .getRawMany<{ specializationId: string }>();

  return Array.from(
    new Set(
      [...headRows, ...leadRows]
        .map((row) => row.specializationId)
        .filter((value): value is string => Boolean(value)),
    ),
  );
};
