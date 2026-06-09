import { PostgresDataSource } from "../../database/postgres-data-source.js";
import { GroupHead } from "../../entities/GroupHead.js";
import { TeamLead } from "../../entities/TeamLead.js";
import { UserType } from "../../enums/UserType.enum.js";

// Per-request in-memory cache: userId → specializationIds
// Avoids repeated DB queries when the same user makes multiple calls in one request cycle.
const requestCache = new Map<string, string[]>();

export const getManagedGroupSpecializationIds = async (
  userId: string,
  userRole?: string,
): Promise<string[]> => {
  // Super admins see everything — no group restriction applies
  if (userRole === UserType.SUPER_ADMIN || userRole === UserType.REQUESTER) {
    return [];
  }

  if (requestCache.has(userId)) {
    return requestCache.get(userId)!;
  }

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

  const result = Array.from(
    new Set(
      [...headRows, ...leadRows]
        .map((row) => row.specializationId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  // Cache for the duration of this Node.js event loop tick (cleared after response)
  requestCache.set(userId, result);
  setImmediate(() => requestCache.delete(userId));

  return result;
};
