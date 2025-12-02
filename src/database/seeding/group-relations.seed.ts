// src/database/seeding/group-relations.seed.ts
import { DataSource, In } from "typeorm";
import {
  Group,
  GroupSpecialization,
  GroupHead,
  Specialization,
  User,
  TechnicianGroup,
} from "../../entities/index.js";
import { UserType } from "../../enums/UserType.enum.js";

// ---------- Helpers ----------
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubset<T>(arr: T[], maxCount: number): T[] {
  if (arr.length === 0) return [];
  const count = Math.floor(Math.random() * Math.min(maxCount, arr.length)) + 1; // 1..maxCount
  const copy = [...arr];
  const result: T[] = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
    if (copy.length === 0) break;
  }

  return result;
}

// Call AFTER you seeded:
// - Specializations
// - Users (admins/technicians)
export async function seedGroupRelations(dataSource: DataSource) {
  const groupRepo = dataSource.getRepository(Group);
  const specRepo = dataSource.getRepository(Specialization);
  const userRepo = dataSource.getRepository(User);
  const gsRepo = dataSource.getRepository(GroupSpecialization);
  const ghRepo = dataSource.getRepository(GroupHead);
  const tgRepo = dataSource.getRepository(TechnicianGroup); // ⬅️ NEW

  // 1) load groups & specs
  const groups = await groupRepo
    .createQueryBuilder("g")
    .where("g.deletedAt IS NULL")
    .getMany();

  const specs = await specRepo
    .createQueryBuilder("s")
    .where("s.deletedAt IS NULL")
    .getMany();

  // 2a) load candidate heads (Admins + SUPER_ADMIN)
  const candidateHeads = await userRepo
    .createQueryBuilder("u")
    .where("u.deletedAt IS NULL")
    .andWhere("u.user_type IN (:...types)", {
      types: [UserType.ADMIN, UserType.SUPER_ADMIN],
    })
    .getMany();

  // 2b) load technicians for TechnicianGroup
  const technicians = await userRepo
    .createQueryBuilder("u")
    .where("u.deletedAt IS NULL")
    .andWhere("u.user_type = :techType", { techType: UserType.TECHNICIAN })
    .getMany();

  if (groups.length === 0) {
    console.warn("⚠️ [GroupRelationsSeed] No groups found.");
    return;
  }
  if (specs.length === 0) {
    console.warn("⚠️ [GroupRelationsSeed] No specializations found.");
  }
  if (candidateHeads.length === 0) {
    console.warn(
      "⚠️ [GroupRelationsSeed] No candidate heads (Admin/SUPER_ADMIN) found."
    );
  }
  if (technicians.length === 0) {
    console.warn(
      "⚠️ [GroupRelationsSeed] No technicians found for TechnicianGroup."
    );
  }

  console.log(
    `ℹ️ [GroupRelationsSeed] Loaded: ${groups.length} groups, ${specs.length} specs, ${candidateHeads.length} candidate heads.`
  );

  // 3) For each group, assign random specializations
  for (const group of groups) {
    if (specs.length > 0) {
      const randomSpecs = getRandomSubset(specs, 3);
      const randomSpecIds = randomSpecs.map((s) => s.id);

      // remove existing relations for these specs (idempotent)
      if (randomSpecIds.length > 0) {
        await gsRepo
          .createQueryBuilder()
          .delete()
          .from(GroupSpecialization)
          .where("groupId = :groupId", { groupId: group.id })
          .andWhere("specializationId IN (:...specIds)", {
            specIds: randomSpecIds,
          })
          .execute();

        const newRelations = randomSpecIds.map((specId) =>
          gsRepo.create({
            group,
            specialization: { id: specId } as Specialization,
          })
        );

        await gsRepo.save(newRelations);
        console.log(
          `✅ [GroupRelationsSeed] Group ${group.id} assigned ${randomSpecIds.length} specs.`
        );
      }
    }

    // 4) For each group, assign one random head
    if (candidateHeads.length > 0) {
      const chosenHead = getRandomItem(candidateHeads);

      // remove existing head record for same group/user combination (idempotent)
      await ghRepo
        .createQueryBuilder()
        .delete()
        .from(GroupHead)
        .where("groupId = :groupId", { groupId: group.id })
        .andWhere("userId = :userId", { userId: chosenHead.id })
        .execute();

      const gh = ghRepo.create({
        group,
        user: chosenHead,
      });

      await ghRepo.save(gh);
      console.log(
        `✅ [GroupRelationsSeed] Group ${group.id} head set to ADMIN ${chosenHead.email}`
      );
    }

    // 4) For each group, assign one random head
    if (candidateHeads.length > 0) {
      const chosenHead = getRandomItem(candidateHeads);

      await ghRepo
        .createQueryBuilder()
        .delete()
        .from(GroupHead)
        .where("groupId = :groupId", { groupId: group.id })
        .andWhere("userId = :userId", { userId: chosenHead.id })
        .execute();

      const gh = ghRepo.create({
        group,
        user: chosenHead,
      });

      await ghRepo.save(gh);
      console.log(
        `✅ [GroupRelationsSeed] Group ${group.id} head set to user ${chosenHead.email}`
      );
    }

    // 5) For each group, assign random technicians (TechnicianGroup)
    if (technicians.length > 0) {
      // e.g. up to 5 technicians per group
      const techsForGroup = getRandomSubset(technicians, 5);

      // Idempotent: remove existing rows for this group
      await tgRepo
        .createQueryBuilder()
        .delete()
        .from(TechnicianGroup)
        .where("groupId = :groupId", { groupId: group.id })
        .execute();

      if (techsForGroup.length > 0) {
        const newTechGroups = techsForGroup.map((tech) =>
          tgRepo.create({
            group,
            user: tech,
          })
        );

        await tgRepo.save(newTechGroups);

        console.log(
          `✅ [GroupRelationsSeed] Group ${group.id} assigned ${techsForGroup.length} technicians.`
        );
      }
    }
  }
}
