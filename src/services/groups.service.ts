import { Group } from "../entities/Group.js";
import { User } from "../entities/User.js";
import { GroupHead } from "../entities/GroupHead.js";
import { GroupSpecialization } from "../entities/GroupSpecialization.js";
import { TechnicianGroup } from "../entities/TechnicianGroup.js";
import { Specialization } from "../entities/Specialization.js";
import { AppError } from "../utils/AppError.js";
import type { Request } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import logger from "../utils/logger.js";
import { In } from "typeorm";
import { buildPagination, PaginationQuery } from "../utils/pagination.js";
import { audit } from "../helpers/auditBuilder.js";

const groupsRepository = PostgresDataSource.getRepository(Group);
const usersRepository = PostgresDataSource.getRepository(User);
const specializationsRepository =
  PostgresDataSource.getRepository(Specialization);
const groupHeadRepository = PostgresDataSource.getRepository(GroupHead);
const groupSpecializationRepository =
  PostgresDataSource.getRepository(GroupSpecialization);
const technicianGroupRepository =
  PostgresDataSource.getRepository(TechnicianGroup);

type CreateGroupInput = {
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  color: string;
  team_leader_id: string;
  heads: string[];
  specializations: string[];
};

interface GroupFilters {
  name?: string;
}

export const createGroup = async (
  data: CreateGroupInput,
  t: Request["t"],
  req?: Request,
) => {
  logger.info("[server][groups][service] createGroup start", { data });
  const auditLog = audit(req);

  // Validate team leader exists
  const leader = await usersRepository.findOne({
    where: { id: data.team_leader_id, deletedAt: null },
  });

  if (!leader) {
    auditLog.step(`Team leader not found: ${data.team_leader_id}`);
    logger.info("[server][groups][service] team leader not found", {
      team_leader: data.team_leader_id,
    });
    throw new AppError(t("team_leader_not_found"), 404);
  }

  // Validate heads exist
  const foundHeads = await usersRepository.findBy({
    id: In(data.heads),
    deletedAt: null,
  });

  if (foundHeads.length !== data.heads.length) {
    auditLog.step("One or more heads not found");
    logger.info("[groups][service] One or more heads not found", {
      expected: data.heads,
      found: foundHeads.map((h) => h.id),
    });
    throw new AppError(t("one_or_more_heads_not_found"), 404);
  }

  // Validate specializations exist
  const foundSpecs = await specializationsRepository.findBy({
    id: In(data.specializations),
    deletedAt: null,
  });

  if (foundSpecs.length !== data.specializations.length) {
    auditLog.step("One or more specializations not found");
    logger.info("[groups][service] One or more specializations not found", {
      expected: data.specializations,
      found: foundSpecs.map((s) => s.id),
    });
    throw new AppError(t("one_or_more_specializations_not_found"), 404);
  }

  // Create group entity with team leader
  const group = groupsRepository.create({
    name: { en: data.name_en, ar: data.name_ar },
    descriptions: { en: data.description_en, ar: data.description_ar },
    color: data.color,
    teamLeader: leader,
  });

  try {
    await groupsRepository.save(group);
    auditLog.step(`Group saved with team leader ${leader.id}`);
    logger.info("[server][groups][service] Group saved with team leader", {
      id: group.id,
      teamLeaderId: leader.id,
    });

    // Assign heads
    for (const headId of data.heads) {
      const headUser = foundHeads.find((h: any) => h.id === headId);
      const gh = groupHeadRepository.create({
        group,
        user: headUser,
      });
      await groupHeadRepository.save(gh);
      auditLog.step(`Assigned head ${headId}`);
      logger.info("[server][groups][service] Head assigned", {
        groupId: group.id,
        headId,
      });
    }

    // Assign specializations
    for (const specId of data.specializations) {
      const spec = foundSpecs.find((s: any) => s.id === specId);
      const gs = groupSpecializationRepository.create({
        group,
        specialization: spec,
      });
      await groupSpecializationRepository.save(gs);
      auditLog.step(`Assigned specialization ${specId}`);
      logger.info("[server][groups][service] Specialization assigned", {
        groupId: group.id,
        specId,
      });
    }

    auditLog.step("createGroup completed");
    logger.info("[server][groups][service] createGroup completed", {
      groupId: group.id,
    });

    return {
      id: group.id,
      name: group.name,
      descriptions: group.descriptions,
      color: group.color,
    };
  } catch (err: any) {
    auditLog.step("Error occurred during group creation");
    logger.error("[server][groups][service] Error saving group or relations", {
      error: err,
    });
    // Rollback
    try {
      if (group?.id) await groupsRepository.delete(group.id);
    } catch (deleteErr) {
      logger.error(
        "[server][groups][service] Failed to cleanup group after error",
        { error: deleteErr },
      );
    }
    throw new AppError(t("internal_server_error"), 500);
  }
};

// export const bulkAssignUsersToGroup = async (
//   groupId: string,
//   userIds: string[],
//   t: any
// ) => {
//   logger.info("[server][groups][service] bulkAssignUsersToGroup start", {
//     groupId,
//     userIds,
//   });

//   const group = await groupsRepository.findOne({
//     where: { id: groupId, deletedAt: null },
//   });
//   if (!group) {
//     logger.info("[server][groups][service] Group not found", { groupId });
//     throw new AppError(t("group_not_found"), 404);
//   }

//   // Fetch all users in one query
//   const users = await usersRepository.findBy({
//     id: In(userIds),
//     deletedAt: null,
//   });

//   if (users.length !== userIds.length) {
//     const foundIds = users.map((u) => u.id);
//     const missing = userIds.filter((id) => !foundIds.includes(id));
//     logger.info("[server][groups][service] Some users not found", { missing });
//     throw new AppError(
//       t("some_users_not_found", { ids: missing.join(", ") }),
//       404
//     );
//   }

//   // Create relations
//   const relations = users.map((user) =>
//     technicianGroupRepository.create({
//       group,
//       user,
//     })
//   );

//   try {
//     await technicianGroupRepository.save(relations);
//     logger.info(
//       "[server][groups][service] Users assigned to group successfully",
//       { groupId }
//     );
//     return true;
//   } catch (err: any) {
//     logger.error("[server][groups][service] Failed to assign users", {
//       error: err,
//     });
//     throw new AppError(t("internal_server_error"), 500);
//   }
// };

export const getGroupById = async (
  groupId: string,
  t: any,
  lang: string = "en",
  req?: Request,
) => {
  const auditLog = audit(req);
  logger.info("[server][groups][service] getGroupById request received", {
    groupId,
  });

  // const group = await groupsRepository.findOne({
  //   where: { id: groupId, deletedAt: null },
  // })
  const groupQuery = groupsRepository
    .createQueryBuilder("group")
    .leftJoinAndSelect("group.teamLeader", "teamLeader")
    .leftJoinAndSelect("group.heads", "groupHeads")
    .leftJoinAndSelect("groupHeads.user", "headUser")
    .leftJoinAndSelect("group.specializations", "groupSpecializations")
    .leftJoinAndSelect("groupSpecializations.specialization", "specialization")
    .where("group.deletedAt IS NULL")
    .where("group.id = :id", { id: groupId });

  const group = await groupQuery.getOne();

  if (!group) {
    auditLog.step("Group not found");
    logger.info("[server][groups][service] Group not found", { groupId });
    throw new AppError(t("group_not_found"), 404);
  }

  return {
    id: group.id,
    name_en: group.name?.en || "",
    name_ar: group.name?.ar || "",
    description_en: group.descriptions?.en || "",
    description_ar: group.descriptions?.ar || "",
    color: group.color || "",
    specializations: group.specializations.map((s) => {
      return {
        id: s.specialization.id,
        name:
          lang === "en" ? s.specialization.name.en : s.specialization.name.ar,
      };
    }),
  };
};

export const softDeleteGroup = async (
  groupId: string,
  t: any,
  req?: Request,
) => {
  const auditLog = audit(req);
  logger.info("[server][groups][service] softDeleteGroup request received", {
    groupId,
  });

  const group = await groupsRepository.findOne({
    where: { id: groupId, deletedAt: null },
  });
  if (!group) {
    auditLog.step("Group not found");
    logger.info("[server][groups][service] Group not found", { groupId });
    throw new AppError(t("group_not_found"), 404);
  }

  if (group.deletedAt) {
    auditLog.step("Group already deleted");
    logger.info("[server][groups][service] Group already deleted", { groupId });
    return {
      is_deleted: false,
      message: t("group_already_deleted"),
      errors: [],
    };
  }

  group.deletedAt = new Date();
  await groupsRepository.save(group);

  auditLog.step("Group soft-deleted successfully").resource("group", groupId);
  logger.info("[server][groups][service] Group soft-deleted successfully", {
    groupId,
  });

  return {
    is_deleted: true,
    message: t("group_deleted_successfully"),
    errors: [],
  };
};

// export const editGroup = async (groupId: string, data: any, t: any) => {
//   logger.info("[server][groups][service] editGroup request received", {
//     groupId,
//     data,
//   });

//   const group = await groupsRepository.findOne({ where: { id: groupId } });
//   if (!group) {
//     logger.info("[server][groups][service] Group not found", { groupId });
//     throw new AppError(t("group_not_found"), 404);
//   }

//   group.name.en = data.name_en ?? group.name.en;
//   group.name.ar = data.name_ar ?? group.name.ar;
//   group.descriptions.en = data.description_en ?? group.descriptions.en;
//   group.descriptions.ar = data.description_ar ?? group.descriptions.ar;
//   group.color = data.color ?? group.color;

//   if (data.team_leader) {
//     const leader = await usersRepository.findOne({
//       where: { id: data.team_leader, deletedAt: null },
//     });

//     if (!leader) {
//       logger.info("[server][groups][service] Team leader not found", {
//         team_leader: data.team_leader,
//       });
//       throw new AppError(t("team_leader_not_found"), 404);
//     }

//     group.teamLeader = leader;
//     logger.info("[server][groups][service] Team leader updated", {
//       groupId,
//       newLeaderId: leader.id,
//     });
//   }

//   if (Array.isArray(data.heads) && data.heads.length > 0) {
//     group.heads = data.heads.map((h: any) => h.id);
//   }

//   if (Array.isArray(data.specializations) && data.specializations.length > 0) {
//     group.specializations = data.specializations.map((s: any) => s.id);
//   }

//   await groupsRepository.save(group);

//   logger.info("[server][groups][service] Group updated successfully", {
//     groupId,
//   });

//   return {
//     is_updated: true,
//     message: t("group_updated_successfully"),
//     errors: [],
//   };
// };

const getUserFullName = (user: User, locale: string): string => {
  const lang = locale === "ar" ? "ar" : "en";
  const firstName = user.firstName?.[lang] || "";
  const midName = user.midName?.[lang] || "";
  const lastName = user.lastName?.[lang] || "";
  return [firstName, midName, lastName].filter(Boolean).join(" ").trim();
};

export const getAllGroups = async (
  pagination: PaginationQuery,
  filters: GroupFilters,
  t: any,
  req?: Request,
) => {
  const auditLog = audit(req);

  logger.info("[server][groups][service] getAllGroups request received", {
    pagination,
    filters,
  });

  const { skip, take, meta } = buildPagination(pagination);

  // Get current locale from t function
  const locale = t.locale || "en";

  // Build query
  const queryBuilder = groupsRepository
    .createQueryBuilder("group")
    .leftJoinAndSelect("group.teamLeader", "teamLeader")
    .leftJoinAndSelect("group.heads", "groupHeads")
    .leftJoinAndSelect("groupHeads.user", "headUser")
    .leftJoinAndSelect("group.specializations", "groupSpecializations")
    .leftJoinAndSelect("groupSpecializations.specialization", "specialization")
    .where("group.deletedAt IS NULL");

  // Apply name filter if provided
  if (filters.name && filters.name.trim()) {
    queryBuilder.andWhere(
      `("group"."name"->>'en' ILIKE :name OR "group"."name"->>'ar' ILIKE :name)`,
      { name: `%${filters.name.trim()}%` },
    );
  }

  // Get total count
  const total = await queryBuilder.getCount();

  // Get paginated results
  const groups = await queryBuilder.skip(skip).take(take).getMany();

  auditLog.step(`Groups fetched successfully`).metadata({
    total,
    returned: groups.length,
    locale,
  });
  logger.info("[server][groups][service] Groups fetched successfully", {
    total,
    returned: groups.length,
    locale,
  });

  // Map to response format
  const mappedGroups = groups.map(async (group) => ({
    id: group.id,
    name_en: group.name?.en || "",
    name_ar: group.name?.ar || "",
    description_en: group.descriptions?.en || "",
    description_ar: group.descriptions?.ar || "",
    color: group.color || "",
    team_leader: (group as any).__teamLeader__
      ? {
          id: (group as any).__teamLeader__.id,
          name: getUserFullName((group as any).__teamLeader__, locale),
        }
      : null,
    heads:
      (group as any).heads?.map((gh) => ({
        id: gh.user.id,
        name: getUserFullName(gh.user, locale),
      })) || [],
    specializations:
      (group as any).specializations?.map((gs) => ({
        id: gs.specialization.id,
        name: gs.specialization.name?.[locale] || "",
      })) || [],
  }));

  return {
    groups: await Promise.all(mappedGroups),
    meta_data: {
      total,
      page_index: meta.page_index,
      page_size: meta.page_size,
    },
  };
};

export const getGroupUsersService = async (
  groupId: string,
  query: any,
  req?: Request,
) => {
  const auditLog = audit(req);

  const pageIndex = +(query.page_index || 1);
  const pageSize = +(query.page_size || 10);

  const group = await groupsRepository.findOne({
    where: { id: groupId },
    relations: [
      "heads",
      "heads.user",
      "teamLeader",
      "technicians",
      "technicians.user",
    ],
  });

  console.log(group);
  logger.info(
    `[server][groups][service] getGroupUsers request received ${group.id}`,
  );

  if (!group) {
    auditLog.step("Group not found");
    throw new AppError("group_not_found", 404);
  }

  // Extract ids from actual fields
  const teamLeaderId = (group as any).__teamLeader__?.id ?? null;
  const headIds = (group as any).heads?.map((h) => h.user.id) ?? [];
  const technicianIds = (group as any).technicians?.map((t) => t.user.id) ?? [];
  // Paginate technicians
  const [technicians, total] = await usersRepository.findAndCount({
    where: {
      id: In(technicianIds),
    },
    // skip: (pageIndex - 1) * pageSize,
    // take: pageSize,
  });

  const teamLeader = teamLeaderId
    ? await usersRepository.findOne({ where: { id: teamLeaderId } })
    : null;

  const heads = headIds.length
    ? await usersRepository.find({ where: { id: In(headIds) } })
    : [];

  auditLog.step(`Group users fetched successfully`).metadata({
    total,
    page_index: pageIndex,
    page_size: pageSize,
    technicians: technicians.length,
    heads: heads.length,
    teamLeader: !!teamLeader,
  });

  return {
    team_leader: mapUserToResponse(teamLeader),
    heads: heads.map(mapUserToResponse),
    technicians: technicians.map(mapUserToResponse),
    meta_data: {
      total,
      page_index: pageIndex,
      page_size: pageSize,
    },
  };
};

const mapUserToResponse = (user: any) => {
  if (!user) return null;

  return {
    id: user.id,
    image: user.image,
    email: user.email,
    first_name: user.firstName?.en,
    mid_name: user.midName?.en,
    last_name: user.lastName?.en,
    user_type: user.user_type,
    status: user.status,
  };
};

export const editGroup = async (
  groupId: string,
  data: any,
  t: any,
  req?: Request,
) => {
  const auditLog = audit(req);

  logger.info("[server][groups][service] editGroup request received", {
    groupId,
    data,
  });

  const group = await groupsRepository.findOne({ where: { id: groupId } });
  if (!group) {
    auditLog.step("Group not found");
    logger.info("[server][groups][service] Group not found", { groupId });
    throw new AppError(t("group_not_found"), 404);
  }

  // --- Track old values for audit ---
  const oldValue: any = {
    name: { ...group.name },
    descriptions: { ...group.descriptions },
    color: group.color,
    teamLeaderId: (await group.teamLeader)?.id ?? null,
    heads: (group as any).heads?.map((h) => h.user.id) || [],
    specializations:
      (group as any).specializations?.map((s) => s.specialization.id) || [],
  };

  // --- Update basic info ---
  group.name.en = data.name_en ?? group.name.en;
  group.name.ar = data.name_ar ?? group.name.ar;
  group.descriptions.en = data.description_en ?? group.descriptions.en;
  group.descriptions.ar = data.description_ar ?? group.descriptions.ar;
  group.color = data.color ?? group.color;

  // --- Update team leader ---
  if (data.team_leader_id) {
    const leader = await usersRepository.findOne({
      where: { id: data.team_leader_id, deletedAt: null },
    });
    if (!leader) {
      logger.info("[server][groups][service] Team leader not found", {
        team_leader: data.team_leader_id,
      });
      throw new AppError(t("team_leader_not_found"), 404);
    }
    group.teamLeader = leader;
    logger.info("[server][groups][service] Team leader updated", {
      groupId,
      newLeaderId: leader.id,
    });
  }

  // --- Update heads ---
  if (Array.isArray(data.heads)) {
    // Remove old heads
    const oldHeads = await groupHeadRepository.find({
      where: { group: { id: group.id } },
    });
    if (oldHeads.length) await groupHeadRepository.remove(oldHeads);

    // Add new heads
    if (data.heads.length > 0) {
      const foundHeads = await usersRepository.findBy({
        id: In(data.heads),
        deletedAt: null,
      });

      const newHeads = foundHeads.map((user) =>
        groupHeadRepository.create({ group, user }),
      );
      await groupHeadRepository.save(newHeads);
    }
  }

  // --- Update specializations ---
  if (Array.isArray(data.specializations)) {
    // Remove old specs
    const oldSpecs = await groupSpecializationRepository.find({
      where: { group: { id: group.id } },
    });
    if (oldSpecs.length) await groupSpecializationRepository.remove(oldSpecs);

    // Add new specs
    if (data.specializations.length > 0) {
      const foundSpecs = await specializationsRepository.findBy({
        id: In(data.specializations),
        deletedAt: null,
      });

      const newSpecs = foundSpecs.map((spec) =>
        groupSpecializationRepository.create({ group, specialization: spec }),
      );
      await groupSpecializationRepository.save(newSpecs);
    }
  }

  // --- Save group ---
  await groupsRepository.save(group);

  // ✅ Reload group with relations to return correct heads & specializations
  const updatedGroup = await groupsRepository.findOne({
    where: { id: group.id },
    relations: [
      "heads",
      "heads.user",
      "specializations",
      "specializations.specialization",
      "teamLeader",
    ],
  });
  const newValue: any = {
    name: { ...updatedGroup!.name },
    descriptions: { ...updatedGroup!.descriptions },
    color: updatedGroup!.color,
    teamLeaderId: (await updatedGroup!.teamLeader)?.id ?? null,
    heads: updatedGroup!.heads?.map((h: any) => h.user.id) || [],
    specializations:
      updatedGroup!.specializations?.map((s: any) => s.specialization.id) || [],
  };

  auditLog
    .step("Group updated successfully")
    .resource("group", groupId)
    .metadata({ oldValue, newValue });

  logger.info("[server][groups][service] Group updated successfully", {
    groupId,
    updatedGroup,
  });

  return {
    is_updated: true,
    message: t("group_updated_successfully"),
    group: updatedGroup,
  };
};

export const bulkAssignUsersToGroup = async (
  groupId: string,
  userIds: string[],
  t: any,
  req?: Request,
) => {
  const auditLog = audit(req);
  logger.info("[server][groups][service] bulkAssignUsersToGroup start", {
    groupId,
    userIds,
  });

  const group = await groupsRepository.findOne({
    where: { id: groupId, deletedAt: null },
    relations: ["technicians", "technicians.user"], // include current assignments
  });
  if (!group) {
    auditLog.step(`Group not found: ${groupId}`);
    throw new AppError(t("group_not_found"), 404);
  }

  const users = await usersRepository.findBy({
    id: In(userIds),
    deletedAt: null,
  });

  if (users.length !== userIds.length) {
    const foundIds = users.map((u) => u.id);
    const missing = userIds.filter((id) => !foundIds.includes(id));
    auditLog.step(`Some users not found: ${missing.join(", ")}`);
    throw new AppError(
      t("some_users_not_found", { ids: missing.join(", ") }),
      404,
    );
  }

  // Current assigned user IDs
  const currentIds = group.technicians.map((t: any) => t.user.id);

  // Users to remove
  const toRemove = group.technicians.filter(
    (t: any) => !userIds.includes(t.user.id),
  );

  // Users to add
  const toAdd = users.filter((u) => !currentIds.includes(u.id));

  try {
    // Remove unassigned users
    if (toRemove.length > 0) {
      await technicianGroupRepository.remove(toRemove);
    }

    // Add new assignments
    const newRelations = toAdd.map((user) =>
      technicianGroupRepository.create({ group, user }),
    );
    if (newRelations.length > 0) {
      await technicianGroupRepository.save(newRelations);
    }

    logger.info(
      "[server][groups][service] Users assigned/removed successfully",
      {
        groupId,
        added: toAdd.map((u) => u.id),
        removed: toRemove.map((r) => r.user.id),
      },
    );

    return {
      added: toAdd.map((u) => u.id),
      removed: toRemove.map((r) => r.user.id),
    };
  } catch (err: any) {
    auditLog.step("Failed to assign/remove users due to internal error");
    logger.error("[server][groups][service] Failed to assign/remove users", {
      error: err,
    });
    throw new AppError(t("internal_server_error"), 500);
  }
};
