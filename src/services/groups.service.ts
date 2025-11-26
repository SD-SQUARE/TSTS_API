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

/**
 * Initialize repositories at module load (as you requested)
 */
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
  team_leader: string;
  heads: string[];
  specializations: string[];
};

export const createGroup = async (data: CreateGroupInput, t: Request["t"]) => {
  logger.info("[server][groups][service] createGroup start", { data });

  // Validate team leader exists
  const leader = await usersRepository.findOne({
    where: { id: data.team_leader },
  });

  if (!leader) {
    logger.info("[server][groups][service] team leader not found", {
      team_leader: data.team_leader,
    });
    throw new AppError(t("team_leader_not_found"), 404);
  }

  // Validate heads exist
  const foundHeads = await usersRepository.findBy({
    id: In(data.heads),
  });

  if (foundHeads.length !== data.heads.length) {
    logger.info("[groups][service] One or more heads not found", {
      expected: data.heads,
      found: foundHeads.map((h) => h.id),
    });
    throw new AppError(t("one_or_more_heads_not_found"), 404);
  }

  // Validate specializations exist
  const foundSpecs = await specializationsRepository.findBy({
    id: In(data.specializations),
  });

  if (foundSpecs.length !== data.specializations.length) {
    logger.info("[groups][service] One or more specializations not found", {
      expected: data.specializations,
      found: foundSpecs.map((s) => s.id),
    });
    throw new AppError(t("one_or_more_specializations_not_found"), 404);
  }

  // Create group entity
  const group = groupsRepository.create({
    name: { en: data.name_en, ar: data.name_ar },
    descriptions: { en: data.description_en, ar: data.description_ar },
    color: data.color,
  });

  try {
    await groupsRepository.save(group);
    logger.info("[server][groups][service] Group saved", { id: group.id });

    // Assign team leader → TechnicianGroup
    const leaderRelation = technicianGroupRepository.create({
      group,
      user: leader,
    });
    await technicianGroupRepository.save(leaderRelation);
    logger.info("[server][groups][service] Team leader assigned", {
      groupId: group.id,
      leaderId: leader.id,
    });

    // Assign heads
    for (const headId of data.heads) {
      const headUser = foundHeads.find((h: any) => h.id === headId);
      const gh = groupHeadRepository.create({
        group,
        user: headUser,
      });
      await groupHeadRepository.save(gh);
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
      logger.info("[server][groups][service] Specialization assigned", {
        groupId: group.id,
        specId,
      });
    }

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
    logger.error("[server][groups][service] Error saving group or relations", {
      error: err,
    });
    // Rollback
    try {
      if (group?.id) await groupsRepository.delete(group.id);
    } catch (deleteErr) {
      logger.error(
        "[server][groups][service] Failed to cleanup group after error",
        { error: deleteErr }
      );
    }
    throw new AppError(t("internal_server_error"), 500);
  }
};
