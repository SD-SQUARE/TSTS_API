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
import {
  arabicMenNames,
  englishMenNames,
  arabicNames,
  englishNames,
} from "./personNamesDataSet.js";
import { downloadAvatarImage } from "./downloadAvatarImage.js";
import { Faker, ar, en } from "@faker-js/faker";

// ---------- Helpers ----------
function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSubset<T>(arr: T[], maxCount: number): T[] {
  if (arr.length === 0) return [];
  const count = Math.floor(Math.random() * Math.min(maxCount, arr.length)) + 1;
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

// Structure to store department/domain/university details
type DeptTriple = {
  deptId: string;
  domainId: string;
  uniId: string;
};

// Main function to seed admins
export async function seedAdmins(dataSource: DataSource, count = 100) {
  const faker = new Faker({
    locale: [en, ar],
  });

  const deptRepo = dataSource.getRepository(Department);
  const profileRepo = dataSource.getRepository(PermissionProfile);
  const specRepo = dataSource.getRepository(Specialization);
  const userRepo = dataSource.getRepository(User);

  // Load department/domain/university IDs
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

  // Check if we have data to proceed with
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

  // Loop to create admins
  for (let i = 1; i <= count; i++) {
    const email = `admin${i}@example.com`;

    // Check if the admin already exists
    const existing = await userRepo
      .createQueryBuilder("u")
      .where("u.email = :email", { email })
      .andWhere("u.deletedAt IS NULL")
      .getOne();

    if (existing) {
      console.log(`ℹ️ [AdminsSeed] Admin already exists: ${email}`);
      continue;
    }

    // Pick random dept/domain/uni triple
    const randomDeptTriple = getRandomItem(deptTriples);
    const randomProfile = getRandomItem(profiles);
    const randomSpecs = getRandomSubset(specs, 3);
    const allowedSpecializations = randomSpecs.map((s) => s.id);

    // Generate deterministic SSN & mobile
    const ssn = (10000000000000 + i).toString();
    const mobile = `010${String(1000000 + i).slice(-7)}`;

    // Prepare admin data
    const adminDto: CreateAdminMapped = {
      email,
      password: "Admin@123456", // Admin password (hashed in service)

      firstNameAr: arabicNames[i % arabicNames.length],
      firstNameEn: englishNames[i % englishNames.length],

      midNameEn: englishMenNames[(i + 1) % englishMenNames.length],
      midNameAr: arabicMenNames[(i + 1) % arabicMenNames.length],

      lastNameEn: englishMenNames[(i + 2) % englishMenNames.length],
      lastNameAr: arabicMenNames[(i + 2) % arabicMenNames.length],

      ssn,
      mobiles: [mobile, mobile],
      phones: [mobile],

      jobEn: "System Administrator",
      jobAr: "مسؤول نظام",

      university: randomDeptTriple.uniId,
      domain: randomDeptTriple.domainId,
      departments: [randomDeptTriple.deptId],

      permissionProfile: randomProfile.id,
      extraPermissions: [],
      revokedPermissions: [],

      allowedSpecializations,
      userType: UserType.ADMIN,
    };

    console.log(
      `🚀 [AdminsSeed] Creating admin ${i}: ${email} (uni=${randomDeptTriple.uniId}, domain=${randomDeptTriple.domainId}, dept=${randomDeptTriple.deptId}, profile=${randomProfile.id})`
    );

    // Generate avatar URL and download the avatar image
    const avatarUrl = faker.image.avatar();
    const avatarFile = await downloadAvatarImage(avatarUrl);

    // Create the admin and pass the avatar file
    const result = await createAdminService(adminDto, avatarFile);

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
