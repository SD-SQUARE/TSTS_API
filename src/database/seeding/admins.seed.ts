// src/database/seeding/admins.seed.ts
import { DataSource } from "typeorm";
import {
  Department,
  PermissionProfile,
  Specialization,
  User,
} from "../../entities/index.js";
import { UserType } from "../../enums/UserType.enum.js";
import { CreateAdminMapped } from "../../interfaces/admin/ICreateAdmin.js";
import { createAdminService } from "../../services/users/admin/adminCommandService.js";

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

// structure we’ll use to keep things simple
type DeptTriple = {
  deptId: string;
  domainId: string;
  uniId: string;
};

// Call this from your master seeder:
// await seedAdmins(PostgresDataSource, 100);
export async function seedAdmins(dataSource: DataSource, count = 100) {
  const deptRepo = dataSource.getRepository(Department);
  const profileRepo = dataSource.getRepository(PermissionProfile);
  const specRepo = dataSource.getRepository(Specialization);
  const userRepo = dataSource.getRepository(User);

  // 1) Load dept/domain/university IDs in one raw query (NO lazy-rel issues)
  const deptTriplesRaw = await deptRepo
    .createQueryBuilder("dep")
    .innerJoin("dep.domain", "domain")
    .innerJoin("domain.university", "uni")
    .select(["dep.id AS dept_id", "domain.id AS domain_id", "uni.id AS uni_id"])
    .where("dep.deletedAt IS NULL")
    .andWhere("domain.deletedAt IS NULL")
    .andWhere("uni.deletedAt IS NULL")
    .getRawMany<{ dept_id: string; domain_id: string; uni_id: string }>();

  const deptTriples: DeptTriple[] = deptTriplesRaw.map((r) => ({
    deptId: r.dept_id,
    domainId: r.domain_id,
    uniId: r.uni_id,
  }));

  const profiles = await profileRepo
    .createQueryBuilder("p")
    .where("p.deletedAt IS NULL")
    .getMany();

  const specs = await specRepo
    .createQueryBuilder("s")
    .where("s.deletedAt IS NULL")
    .getMany();

  if (deptTriples.length === 0) {
    console.warn(
      "⚠️ [AdminsSeed] No departments with valid domains/universities found."
    );
    return;
  }

  if (profiles.length === 0) {
    console.warn("⚠️ [AdminsSeed] No permission profiles found.");
    return;
  }

  if (specs.length === 0) {
    console.warn(
      "⚠️ [AdminsSeed] No specializations found. Admins will have empty allowedSpecializations."
    );
  }

  console.log(
    `ℹ️ [AdminsSeed] Loaded: ${deptTriples.length} dept/domain/uni triples, ${profiles.length} profiles, ${specs.length} specs.`
  );

  // 2) Loop and create N admins
  for (let i = 1; i <= count; i++) {
    const email = `admin${i}@example.com`;

    // Idempotent: skip if already exists
    const existing = await userRepo
      .createQueryBuilder("u")
      .where("u.email = :email", { email })
      .andWhere("u.deletedAt IS NULL")
      .getOne();

    if (existing) {
      console.log(`ℹ️ [AdminsSeed] Admin already exists: ${email}`);
      continue;
    }

    // pick random dept/domain/uni triple
    const randomDeptTriple = getRandomItem(deptTriples);

    // pick random profile
    const randomProfile = getRandomItem(profiles);

    // pick random subset of specializations (1..3)
    const randomSpecs = getRandomSubset(specs, 3);
    const allowedSpecializations = randomSpecs.map((s) => s.id);

    // deterministic SSN & mobile just to be unique
    const ssn = (10000000000000 + i).toString(); // 14 digits
    const mobile = `010${String(1000000 + i).slice(-7)}`;

    const adminDto: CreateAdminMapped = {
      // -------- auth --------
      email,
      password: "Admin@123456", // will be hashed by mapAdminToUserEntity

      // -------- name fields (based on mapAdminToUserEntity) --------
      firstNameEn: "Admin",
      firstNameAr: "مسؤول",

      midNameEn: "",
      midNameAr: "",

      lastNameEn: `#${i}`,
      lastNameAr: `رقم ${i}`,

      // -------- identity / contacts --------
      ssn,
      mobiles: [mobile],
      phones: [],

      jobEn: "System Administrator",
      jobAr: "مسؤول نظام",

      // -------- relations (IDs) --------
      // validateEntities(university, domain, departments) should accept these IDs
      university: randomDeptTriple.uniId,
      domain: randomDeptTriple.domainId,
      departments: [randomDeptTriple.deptId],

      // permissions
      permissionProfile: randomProfile.id,
      extraPermissions: [],
      revokedPermissions: [],

      // specs
      allowedSpecializations,

      userType: UserType.ADMIN,
    } as CreateAdminMapped;

    console.log(
      `🚀 [AdminsSeed] Creating admin ${i}: ${email} (uni=${randomDeptTriple.uniId}, domain=${randomDeptTriple.domainId}, dept=${randomDeptTriple.deptId}, profile=${randomProfile.id})`
    );

    const result = await createAdminService(adminDto);

    if (!result.is_added) {
      console.error(
        `❌ [AdminsSeed] Failed to create admin ${email}`,
        result.errors
      );
    } else {
      console.log(`✅ [AdminsSeed] Admin created: ${email}`);
    }
  }
}
