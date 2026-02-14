import { DataSource } from "typeorm";
import {
  Department,
  PermissionProfile,
  Specialization,
  User,
} from "../../../entities/index.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { CreateTechnicianMapped } from "../../../interfaces/technician/ICreateTechnician.js";
import { createTechnicianService } from "../../../services/users/technician/technicianCommandService.js";
import {
  arabicMenNames,
  arabicNames,
  englishMenNames,
  englishNames,
} from "./personNamesDataSet.js";
import { Faker, en, ar } from "@faker-js/faker";
import { downloadAvatarImage } from "./downloadAvatarImage.js";

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

type DeptTriple = {
  deptId: string;
  domainId: string;
  uniId: string;
};

export async function seedTechnicians(
  dataSource: DataSource,
  count = 100,
): Promise<void> {
  const faker = new Faker({
    locale: [en, ar],
  });

  const deptRepo = dataSource.getRepository(Department);
  const profileRepo = dataSource.getRepository(PermissionProfile);
  const specRepo = dataSource.getRepository(Specialization);
  const userRepo = dataSource.getRepository(User);

  // 1) load dept/domain/university IDs
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
      "⚠️ [TechniciansSeed] No departments with valid domains/universities found.",
    );
    return;
  }

  if (profiles.length === 0) {
    console.warn("⚠️ [TechniciansSeed] No permission profiles found.");
    return;
  }

  if (specs.length === 0) {
    console.warn(
      "⚠️ [TechniciansSeed] No specializations found. Technicians will have empty allowedSpecializations.",
    );
  }

  console.log(
    `ℹ️ [TechniciansSeed] Loaded: ${deptTriples.length} dept/domain/uni triples, ${profiles.length} profiles, ${specs.length} specs.`,
  );

  // 2) create N technicians
  for (let i = 1; i <= count; i++) {
    const email = `technician${i}@example.com`;

    const existing = await userRepo
      .createQueryBuilder("u")
      .where("u.email = :email", { email })
      .andWhere("u.deletedAt IS NULL")
      .getOne();

    if (existing) {
      console.log(`ℹ️ [TechniciansSeed] Technician already exists: ${email}`);
      continue;
    }

    const randomDept = getRandomItem(deptTriples);
    const randomProfile = getRandomItem(profiles);
    const randomSpecs = getRandomSubset(specs, 3);
    const allowedSpecializations = randomSpecs.map((s) => s.id);

    const ssn = (20000000000000 + i).toString();
    const mobile = `011${String(2000000 + i).slice(-7)}`;

    const dto: CreateTechnicianMapped = {
      email,
      password: "Tech@123456",

      firstNameAr: arabicNames[i % arabicNames.length], // English name
      firstNameEn: englishNames[i % englishNames.length], // Arabic name

      midNameEn: englishMenNames[(i + 1) % englishMenNames.length], // English middle name
      midNameAr: arabicMenNames[(i + 1) % arabicMenNames.length], // Arabic middle name

      lastNameEn: englishMenNames[(i + 2) % englishMenNames.length], // English last name
      lastNameAr: arabicMenNames[(i + 2) % arabicMenNames.length], // Arabic last name

      ssn,
      mobiles: [mobile, mobile],
      phones: [mobile],

      jobEn: "Support Technician",
      jobAr: "فني دعم",

      university: randomDept.uniId,
      domain: randomDept.domainId,

      permissionProfile: randomProfile.id,
      extraPermissions: [],
      revokedPermissions: [],

      allowedSpecializations,

      userType: UserType.TECHNICIAN, // adapt to your enum if name differs
    } as CreateTechnicianMapped;

    console.log(
      `🚀 [TechniciansSeed] Creating technician ${i}: ${email} (uni=${randomDept.uniId}, domain=${randomDept.domainId}, dept=${randomDept.deptId}, profile=${randomProfile.id})`,
    );

    const avatarUrl = faker.image.avatar();
    const avatarFile = await downloadAvatarImage(avatarUrl);
    const result = await createTechnicianService(dto, avatarFile);

    if (!result.is_added) {
      console.error(
        `❌ [TechniciansSeed] Failed to create technician ${email}`,
        result.errors,
      );
    } else {
      console.log(`✅ [TechniciansSeed] Technician created: ${email}`);
    }
  }
}
