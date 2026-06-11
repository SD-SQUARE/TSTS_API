import type { Request } from "express";
import { In } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Group } from "../entities/Group.js";
import { GroupHead } from "../entities/GroupHead.js";
import { GroupSpecialization } from "../entities/GroupSpecialization.js";
import { Group as GroupEntity, Specialization, Team, TeamLead, TeamTechnician, TechnicianGroup, User } from "../entities/index.js";
import { UserType } from "../enums/UserType.enum.js";
import { audit } from "../helpers/auditBuilder.js";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import { PaginationQuery, buildPagination } from "../utils/pagination.js";

const groupsRepository = PostgresDataSource.getRepository(Group);
const usersRepository = PostgresDataSource.getRepository(User);
const specializationsRepository =
  PostgresDataSource.getRepository(Specialization);
const groupHeadRepository = PostgresDataSource.getRepository(GroupHead);
const groupSpecializationRepository =
  PostgresDataSource.getRepository(GroupSpecialization);
const technicianGroupRepository =
  PostgresDataSource.getRepository(TechnicianGroup);
const teamsRepository = PostgresDataSource.getRepository(Team);
const teamLeadRepository = PostgresDataSource.getRepository(TeamLead);
const teamTechnicianRepository = PostgresDataSource.getRepository(TeamTechnician);

type CreateGroupInput = {
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  color: string;
  heads: string[];
  specializations: string[];
};

type EditGroupInput = Partial<CreateGroupInput>;

type TeamAssignmentInput = {
  id?: string;
  name_en: string;
  name_ar: string;
  lead_ids: string[];
  member_ids: string[];
};

type UpsertGroupAssignmentsInput = {
  users: string[];
  teams: TeamAssignmentInput[];
};

interface GroupFilters {
  name?: string;
}

const getUserFullName = (user: User, locale: string): string => {
  const lang = locale === "ar" ? "ar" : "en";
  const firstName = user.firstName?.[lang] || "";
  const midName = user.midName?.[lang] || "";
  const lastName = user.lastName?.[lang] || "";
  return [firstName, midName, lastName].filter(Boolean).join(" ").trim();
};

const mapUserToResponse = (user: User | null, locale: string = "en") => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    image: user.image,
    email: user.email,
    first_name: {
      en: user.firstName?.en || "",
      ar: user.firstName?.ar || "",
    },
    mid_name: {
      en: user.midName?.en || "",
      ar: user.midName?.ar || "",
    },
    last_name: {
      en: user.lastName?.en || "",
      ar: user.lastName?.ar || "",
    },
    first_name_en: user.firstName?.en || "",
    first_name_ar: user.firstName?.ar || "",
    mid_name_en: user.midName?.en || "",
    mid_name_ar: user.midName?.ar || "",
    last_name_en: user.lastName?.en || "",
    last_name_ar: user.lastName?.ar || "",
    name_en: getUserFullName(user, "en"),
    name_ar: getUserFullName(user, "ar"),
    user_type: user.user_type,
    status: user.status,
    job_en: user.job?.en || "",
    job_ar: user.job?.ar || "",
    job_title: {
      en: user.job?.en || "",
      ar: user.job?.ar || "",
    },
    display_name: getUserFullName(user, locale),
  };
};

const ensureHeadsAreAssignable = (users: User[], requestedIds: string[], t: Request["t"]) => {
  if (users.length !== requestedIds.length) {
    throw new AppError(t("one_or_more_heads_not_found"), 404);
  }

  const invalidHead = users.find(
    (user) =>
      user.user_type !== UserType.ADMIN &&
      user.user_type !== UserType.SUPER_ADMIN &&
      user.user_type !== UserType.TECHNICIAN,
  );

  if (invalidHead) {
    throw new AppError(t("one_or_more_heads_not_found"), 404);
  }
};

const ensureTechniciansAreAssignable = (
  users: User[],
  requestedIds: string[],
  t: Request["t"],
  translationKey: string,
) => {
  if (users.length !== requestedIds.length) {
    throw new AppError(t(translationKey), 404);
  }

  const invalidUser = users.find((user) => user.user_type !== UserType.TECHNICIAN);
  if (invalidUser) {
    throw new AppError(t(translationKey), 404);
  }
};

const extractUniqueTeamLeads = (group: GroupEntity, locale: string) => {
  const seen = new Set<string>();
  const users: ReturnType<typeof mapUserToResponse>[] = [];

  for (const team of group.teams || []) {
    for (const lead of team.leads || []) {
      const user = lead.user as User | undefined;
      if (!user || seen.has(user.id)) {
        continue;
      }

      seen.add(user.id);
      users.push(mapUserToResponse(user, locale));
    }
  }

  return users.filter(Boolean);
};

const getGroupRelations = () => [
  "heads",
  "heads.user",
  "specializations",
  "specializations.specialization",
  "technicians",
  "technicians.user",
  "teams",
  "teams.leads",
  "teams.leads.user",
  "teams.technicians",
  "teams.technicians.user",
];

const getUnassignedMembers = (group: GroupEntity, locale: string) => {
  const assignedIds = new Set<string>();

  for (const team of group.teams || []) {
    for (const lead of team.leads || []) {
      if (lead.user?.id) {
        assignedIds.add(lead.user.id);
      }
    }

    for (const member of team.technicians || []) {
      if (member.user?.id) {
        assignedIds.add(member.user.id);
      }
    }
  }

  return (group.technicians || [])
    .map((relation) => relation.user as User | undefined)
    .filter((user): user is User => Boolean(user) && !assignedIds.has(user.id))
    .map((user) => mapUserToResponse(user, locale));
};

const mapGroupSummary = (group: GroupEntity, locale: string) => ({
  id: group.id,
  name_en: group.name?.en || "",
  name_ar: group.name?.ar || "",
  description_en: group.descriptions?.en || "",
  description_ar: group.descriptions?.ar || "",
  color: group.color || "",
  heads: (group.heads || [])
    .map((head) => mapUserToResponse(head.user as User, locale))
    .filter(Boolean)
    .map((user) => ({
      id: user!.id,
      name: user!.display_name,
      name_en: user!.name_en,
      name_ar: user!.name_ar,
      user_type: user!.user_type,
    })),
  team_leads: extractUniqueTeamLeads(group, locale).map((user) => ({
    id: user!.id,
    name: user!.display_name,
    name_en: user!.name_en,
    name_ar: user!.name_ar,
    user_type: user!.user_type,
  })),
  specializations: (group.specializations || []).map((relation) => ({
    id: relation.specialization.id,
    name: relation.specialization.name?.[locale] || "",
  })),
  teams_count: group.teams?.length || 0,
});

const findGroupWithRelations = async (groupId: string) =>
  groupsRepository.findOne({
    where: { id: groupId, deletedAt: null },
    relations: getGroupRelations(),
  });

export const createGroup = async (
  data: CreateGroupInput,
  t: Request["t"],
  req?: Request,
) => {
  const auditLog = audit(req);

  const foundHeads = await usersRepository.findBy({
    id: In(data.heads),
    deletedAt: null,
  });
  ensureHeadsAreAssignable(foundHeads, data.heads, t);

  const foundSpecs = await specializationsRepository.findBy({
    id: In(data.specializations),
    deletedAt: null,
  });

  if (foundSpecs.length !== data.specializations.length) {
    throw new AppError(t("one_or_more_specializations_not_found"), 404);
  }

  const result = await PostgresDataSource.transaction(async (manager) => {
    const groupRepositoryTx = manager.getRepository(Group);
    const groupHeadRepositoryTx = manager.getRepository(GroupHead);
    const groupSpecializationRepositoryTx =
      manager.getRepository(GroupSpecialization);

    const group = groupRepositoryTx.create({
      name: { en: data.name_en, ar: data.name_ar },
      descriptions: { en: data.description_en, ar: data.description_ar },
      color: data.color,
    });

    await groupRepositoryTx.save(group);

    await groupHeadRepositoryTx.save(
      foundHeads.map((user) =>
        groupHeadRepositoryTx.create({
          group,
          user,
        }),
      ),
    );

    await groupSpecializationRepositoryTx.save(
      foundSpecs.map((specialization) =>
        groupSpecializationRepositoryTx.create({
          group,
          specialization,
        }),
      ),
    );

    return group;
  });

  auditLog
    .step("Group created successfully")
    .resource("group", result.id)
    .metadata({ name_en: data.name_en, heads: data.heads });

  return {
    id: result.id,
    name: result.name,
    descriptions: result.descriptions,
    color: result.color,
  };
};

export const getGroupById = async (
  groupId: string,
  t: Request["t"],
  lang: string = "en",
  req?: Request,
) => {
  const auditLog = audit(req);
  const locale = lang === "ar" ? "ar" : "en";

  const group = await findGroupWithRelations(groupId);

  if (!group) {
    auditLog.step("Group not found");
    throw new AppError(t("group_not_found"), 404);
  }

  const summary = mapGroupSummary(group, locale);

  return {
    ...summary,
    teams: (group.teams || []).map((team) => ({
      id: team.id,
      name_en: team.name?.en || "",
      name_ar: team.name?.ar || "",
      leads_count: team.leads?.length || 0,
      members_count: team.technicians?.length || 0,
    })),
  };
};

export const softDeleteGroup = async (
  groupId: string,
  t: Request["t"],
  req?: Request,
) => {
  const auditLog = audit(req);

  const group = await groupsRepository.findOne({
    where: { id: groupId, deletedAt: null },
  });

  if (!group) {
    auditLog.step("Group not found");
    throw new AppError(t("group_not_found"), 404);
  }

  group.deletedAt = new Date();
  await groupsRepository.save(group);

  auditLog.step("Group soft-deleted successfully").resource("group", groupId);

  return {
    is_deleted: true,
    message: t("group_deleted_successfully"),
    errors: [],
  };
};

export const getAllGroups = async (
  pagination: PaginationQuery,
  filters: GroupFilters,
  t: Request["t"],
  req?: Request,
) => {
  const auditLog = audit(req);
  const locale = req?.language === "ar" ? "ar" : "en";
  const { skip, take, meta } = buildPagination(pagination);

  const queryBuilder = groupsRepository
    .createQueryBuilder("group")
    .leftJoinAndSelect("group.heads", "groupHead")
    .leftJoinAndSelect("groupHead.user", "headUser")
    .leftJoinAndSelect("group.specializations", "groupSpecialization")
    .leftJoinAndSelect("groupSpecialization.specialization", "specialization")
    .leftJoinAndSelect("group.teams", "team")
    .leftJoinAndSelect("team.leads", "teamLead")
    .leftJoinAndSelect("teamLead.user", "teamLeadUser")
    .where("group.deletedAt IS NULL")
    .distinct(true);

  if (filters.name?.trim()) {
    queryBuilder.andWhere(
      `("group"."name"->>'en' ILIKE :name OR "group"."name"->>'ar' ILIKE :name)`,
      { name: `%${filters.name.trim()}%` },
    );
  }

  const total = await queryBuilder.getCount();
  const groups = await queryBuilder.skip(skip).take(take).getMany();

  auditLog.step("Groups fetched successfully").metadata({
    total,
    returned: groups.length,
  });

  return {
    groups: groups.map((group) => mapGroupSummary(group, locale)),
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
  const locale = req?.language === "ar" ? "ar" : "en";
  const pageIndex = +(query.page_index || 1);
  const pageSize = +(query.page_size || 10);

  const group = await findGroupWithRelations(groupId);

  if (!group) {
    auditLog.step("Group not found");
    throw new AppError("group_not_found", 404);
  }

  const technicians = (group.technicians || [])
    .map((relation) => relation.user as User | undefined)
    .filter((user): user is User => Boolean(user))
    .map((user) => mapUserToResponse(user, locale));

  const heads = (group.heads || [])
    .map((relation) => relation.user as User | undefined)
    .filter((user): user is User => Boolean(user))
    .map((user) => mapUserToResponse(user, locale));

  const teams = (group.teams || []).map((team) => ({
    id: team.id,
    name_en: team.name?.en || "",
    name_ar: team.name?.ar || "",
    leads: (team.leads || [])
      .map((relation) => relation.user as User | undefined)
      .filter((user): user is User => Boolean(user))
      .map((user) => mapUserToResponse(user, locale)),
    technicians: (team.technicians || [])
      .map((relation) => relation.user as User | undefined)
      .filter((user): user is User => Boolean(user))
      .map((user) => mapUserToResponse(user, locale)),
  }));

  const teamLeads = extractUniqueTeamLeads(group, locale);
  const unassignedMembers = getUnassignedMembers(group, locale);

  auditLog.step("Group users fetched successfully").metadata({
    technicians: technicians.length,
    heads: heads.length,
    teams: teams.length,
  });

  return {
    heads,
    team_leads: teamLeads,
    technicians,
    teams,
    unassigned_members: unassignedMembers,
    meta_data: {
      total: technicians.length,
      page_index: pageIndex,
      page_size: pageSize,
    },
  };
};

export const editGroup = async (
  groupId: string,
  data: EditGroupInput,
  t: Request["t"],
  req?: Request,
) => {
  const auditLog = audit(req);

  const group = await groupsRepository.findOne({
    where: { id: groupId, deletedAt: null },
  });

  if (!group) {
    throw new AppError(t("group_not_found"), 404);
  }

  const oldValue = {
    name: { ...group.name },
    descriptions: { ...group.descriptions },
    color: group.color,
  };

  if (typeof data.name_en === "string") {
    group.name = { ...(group.name || {}), en: data.name_en };
  }

  if (typeof data.name_ar === "string") {
    group.name = { ...(group.name || {}), ar: data.name_ar };
  }

  if (typeof data.description_en === "string") {
    group.descriptions = {
      ...(group.descriptions || {}),
      en: data.description_en,
    };
  }

  if (typeof data.description_ar === "string") {
    group.descriptions = {
      ...(group.descriptions || {}),
      ar: data.description_ar,
    };
  }

  if (typeof data.color === "string") {
    group.color = data.color;
  }

  await PostgresDataSource.transaction(async (manager) => {
    const groupRepositoryTx = manager.getRepository(Group);
    const groupHeadRepositoryTx = manager.getRepository(GroupHead);
    const groupSpecializationRepositoryTx =
      manager.getRepository(GroupSpecialization);
    const userRepositoryTx = manager.getRepository(User);
    const specializationRepositoryTx = manager.getRepository(Specialization);

    await groupRepositoryTx.save(group);

    if (Array.isArray(data.heads)) {
      const foundHeads = await userRepositoryTx.findBy({
        id: In(data.heads),
        deletedAt: null,
      });
      ensureHeadsAreAssignable(foundHeads, data.heads, t);

      await groupHeadRepositoryTx.delete({ group: { id: groupId } as any });

      if (foundHeads.length) {
        await groupHeadRepositoryTx.save(
          foundHeads.map((user) =>
            groupHeadRepositoryTx.create({
              group,
              user,
            }),
          ),
        );
      }
    }

    if (Array.isArray(data.specializations)) {
      const foundSpecs = await specializationRepositoryTx.findBy({
        id: In(data.specializations),
        deletedAt: null,
      });

      if (foundSpecs.length !== data.specializations.length) {
        throw new AppError(t("one_or_more_specializations_not_found"), 404);
      }

      await groupSpecializationRepositoryTx.delete({ group: { id: groupId } as any });

      if (foundSpecs.length) {
        await groupSpecializationRepositoryTx.save(
          foundSpecs.map((specialization) =>
            groupSpecializationRepositoryTx.create({
              group,
              specialization,
            }),
          ),
        );
      }
    }
  });

  const updatedGroup = await findGroupWithRelations(groupId);

  auditLog.step("Group updated successfully").resource("group", groupId).metadata({
    oldValue,
    newValue: updatedGroup
      ? {
          name: updatedGroup.name,
          descriptions: updatedGroup.descriptions,
          color: updatedGroup.color,
        }
      : null,
  });

  return {
    is_updated: true,
    message: t("group_updated_successfully"),
    group: updatedGroup,
  };
};

const syncTeamLeadRelations = async (
  team: Team,
  leadIds: string[],
  leadUsers: Map<string, User>,
) => {
  const currentRelations = await teamLeadRepository.find({
    where: { team: { id: team.id } as any },
    relations: ["user"],
  });

  const currentIds = new Set(currentRelations.map((relation) => relation.user.id));
  const nextIds = new Set(leadIds);

  const toRemove = currentRelations.filter((relation) => !nextIds.has(relation.user.id));
  if (toRemove.length) {
    await teamLeadRepository.remove(toRemove);
  }

  const toAdd = leadIds
    .filter((id) => !currentIds.has(id))
    .map((id) =>
      teamLeadRepository.create({
        team,
        user: leadUsers.get(id)!,
      }),
    );

  if (toAdd.length) {
    await teamLeadRepository.save(toAdd);
  }
};

const syncTeamTechnicianRelations = async (
  team: Team,
  memberIds: string[],
  memberUsers: Map<string, User>,
) => {
  const currentRelations = await teamTechnicianRepository.find({
    where: { team: { id: team.id } as any },
    relations: ["user"],
  });

  const currentIds = new Set(currentRelations.map((relation) => relation.user.id));
  const nextIds = new Set(memberIds);

  const toRemove = currentRelations.filter(
    (relation) => !nextIds.has(relation.user.id),
  );
  if (toRemove.length) {
    await teamTechnicianRepository.remove(toRemove);
  }

  const toAdd = memberIds
    .filter((id) => !currentIds.has(id))
    .map((id) =>
      teamTechnicianRepository.create({
        team,
        user: memberUsers.get(id)!,
      }),
    );

  if (toAdd.length) {
    await teamTechnicianRepository.save(toAdd);
  }
};

export const upsertGroupAssignments = async (
  groupId: string,
  data: UpsertGroupAssignmentsInput,
  t: Request["t"],
  req?: Request,
) => {
  const auditLog = audit(req);

  const group = await findGroupWithRelations(groupId);

  if (!group) {
    throw new AppError(t("group_not_found"), 404);
  }

  const teamLeadIds = data.teams.flatMap((team) => team.lead_ids || []);
  const teamMemberIds = data.teams.flatMap((team) => team.member_ids || []);
  const requestedGroupUserIds = Array.from(
    new Set([...(data.users || []), ...teamLeadIds, ...teamMemberIds]),
  );

  const foundUsers = requestedGroupUserIds.length
    ? await usersRepository.findBy({
        id: In(requestedGroupUserIds),
        deletedAt: null,
      })
    : [];

  ensureTechniciansAreAssignable(
    foundUsers,
    requestedGroupUserIds,
    t,
    "one_or_more_team_members_not_found",
  );

  const usersById = new Map(foundUsers.map((user) => [user.id, user]));
  const currentGroupRelations = group.technicians || [];
  const currentGroupUserIds = new Set(
    currentGroupRelations
      .map((relation) => relation.user?.id)
      .filter((id): id is string => Boolean(id)),
  );

  const groupRelationsToRemove = currentGroupRelations.filter(
    (relation) => relation.user?.id && !requestedGroupUserIds.includes(relation.user.id),
  );
  if (groupRelationsToRemove.length) {
    await technicianGroupRepository.remove(groupRelationsToRemove);
  }

  const groupRelationsToAdd = requestedGroupUserIds
    .filter((id) => !currentGroupUserIds.has(id))
    .map((id) =>
      technicianGroupRepository.create({
        group,
        user: usersById.get(id)!,
      }),
    );
  if (groupRelationsToAdd.length) {
    await technicianGroupRepository.save(groupRelationsToAdd);
  }

  const existingTeams = group.teams || [];
  const existingTeamsById = new Map(existingTeams.map((team) => [team.id, team]));
  const nextTeamIds = new Set<string>();

  for (const teamInput of data.teams) {
    let team: Team;

    if (teamInput.id) {
      const existingTeam = existingTeamsById.get(teamInput.id);
      if (!existingTeam) {
        throw new AppError(t("team_not_found"), 404);
      }
      team = existingTeam;
    } else {
      team = teamsRepository.create({ group });
    }

    team.name = {
      en: teamInput.name_en,
      ar: teamInput.name_ar,
    };

    await teamsRepository.save(team);
    nextTeamIds.add(team.id);

    const leadUsers = teamInput.lead_ids.map((id) => usersById.get(id)!);
    ensureTechniciansAreAssignable(
      leadUsers,
      teamInput.lead_ids,
      t,
      "one_or_more_team_leads_not_found",
    );

    const memberUsers = teamInput.member_ids.map((id) => usersById.get(id)!);
    ensureTechniciansAreAssignable(
      memberUsers,
      teamInput.member_ids,
      t,
      "one_or_more_team_members_not_found",
    );

    await syncTeamLeadRelations(team, teamInput.lead_ids, usersById);
    await syncTeamTechnicianRelations(team, teamInput.member_ids, usersById);
  }

  const teamsToDelete = existingTeams.filter((team) => !nextTeamIds.has(team.id));
  if (teamsToDelete.length) {
    await teamsRepository.remove(teamsToDelete);
  }

  const updatedGroup = await findGroupWithRelations(groupId);

  auditLog.step("Group assignments updated").resource("group", groupId).metadata({
    users: requestedGroupUserIds,
    teams: data.teams.length,
  });

  return {
    is_updated: true,
    message: t("group_assignments_updated_successfully"),
    group: updatedGroup,
  };
};
