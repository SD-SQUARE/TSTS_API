import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { DataSource, Repository } from "typeorm";

import { PostgresDataSource } from "../postgres-data-source.js";
import {
  Department,
  Domain,
  Group,
  GroupHead,
  GroupSpecialization,
  PermissionProfile,
  Problem,
  Specialization,
  Team,
  TeamLead,
  TeamTechnician,
  TechnicianGroup,
  University,
  User,
} from "../../entities/index.js";
import { UserType } from "../../enums/UserType.enum.js";
import { CreateTechnicianMapped } from "../../interfaces/technician/ICreateTechnician.js";
import { CreateRequesterMapped } from "../../interfaces/requester/ICreateRequester.js";
import { createTechnicianService } from "../../services/users/technician/technicianCommandService.js";
import { createRequesterService } from "../../services/users/requester/requesterCommandService.js";

type SeedSysDataOptions = {
  sysDataDir?: string;
  strict?: boolean;
};

type OrganizationDefaults = {
  universityId: string;
  domainId: string;
  departmentId?: string;
};

const SYS_DATA_FILES = {
  employees: "emp_data.csv",
  groups: "groups.xlsx",
  teams: "teams.xlsx",
  specializationProblems: "spes_problem.xlsx",
  technicians: "technicanis data__updated.xlsx",
};

const GROUP_COLORS = [
  "#1677ff",
  "#52c41a",
  "#fa8c16",
  "#722ed1",
  "#13c2c2",
  "#eb2f96",
];

const normalizeWhitespace = (value: string) => value.trim().replace(/\s+/g, " ");

const normalizeComparable = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/^(dr|mr|mrs|ms|eng)\.?\s+/i, "")
    .replace(/[._-]+/g, " ");

const cellText = (value: ExcelJS.CellValue | undefined): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && value.text) return normalizeWhitespace(String(value.text));
    if ("result" in value && value.result) {
      return normalizeWhitespace(String(value.result));
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return normalizeWhitespace(value.richText.map((item) => item.text).join(""));
    }
  }

  return normalizeWhitespace(String(value));
};

const buildHeaderMap = (worksheet: ExcelJS.Worksheet) => {
  const headerMap = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const normalized = cellText(cell.value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (normalized) {
      headerMap.set(normalized, colNumber);
    }
  });
  return headerMap;
};

const getCellByHeader = (
  row: ExcelJS.Row,
  headerMap: Map<string, number>,
  aliases: string[],
) => {
  const columnIndex = aliases
    .map((alias) => alias.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .map((alias) => headerMap.get(alias))
    .find((value): value is number => Boolean(value));

  return columnIndex ? cellText(row.getCell(columnIndex).value) : "";
};

const splitList = (value: string) =>
  value
    .split(/[,\n;|]+/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);

const splitName = (fullName: string) => {
  const parts = normalizeWhitespace(fullName).split(" ").filter(Boolean);
  return {
    first: parts[0] || fullName,
    mid: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    last: parts.length > 1 ? parts[parts.length - 1] : "",
  };
};

const titleCase = (value: string) =>
  value.replace(/\b[a-z]/g, (char) => char.toUpperCase());

const englishNameFromEmail = (email: string) =>
  titleCase(email.split("@")[0].replace(/[._-]+/g, " "));

const resolveSysDataDir = (requestedDir?: string) => {
  const candidateDirs = [
    requestedDir,
    process.env.SYS_DATA_DIR,
    path.resolve(process.cwd(), "../sys_data"),
    path.resolve(process.cwd(), "sys_data"),
  ].filter(Boolean) as string[];

  return candidateDirs.find((candidate) => fs.existsSync(candidate));
};

const readWorkbook = async (filePath: string) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error(`Workbook has no sheets: ${filePath}`);
  }
  return worksheet;
};

const ensureRelation = async (
  repo: Repository<any>,
  where: Record<string, unknown>,
  createData: Record<string, unknown>,
) => {
  const existing = await repo.findOne({ where: where as any });
  if (existing) return existing;
  return repo.save(repo.create(createData));
};

const getOrganizationDefaults = async (
  dataSource: DataSource,
): Promise<OrganizationDefaults | null> => {
  const universityRepo = dataSource.getRepository(University);
  const domainRepo = dataSource.getRepository(Domain);
  const departmentRepo = dataSource.getRepository(Department);

  const university =
    (await universityRepo
      .createQueryBuilder("u")
      .where("u.name->>'en' ILIKE :name", { name: "%Capital%" })
      .andWhere("u.deletedAt IS NULL")
      .getOne()) ||
    (await universityRepo
      .createQueryBuilder("u")
      .where("u.deletedAt IS NULL")
      .orderBy("u.createdAt", "ASC")
      .getOne());

  if (!university) return null;

  const domain =
    (await domainRepo
      .createQueryBuilder("d")
      .innerJoin("d.university", "u")
      .where("u.id = :universityId", { universityId: university.id })
      .andWhere("d.deletedAt IS NULL")
      .orderBy("d.createdAt", "ASC")
      .getOne()) ||
    (await domainRepo
      .createQueryBuilder("d")
      .where("d.deletedAt IS NULL")
      .orderBy("d.createdAt", "ASC")
      .getOne());

  if (!domain) return null;

  const department = await departmentRepo
    .createQueryBuilder("dep")
    .innerJoin("dep.domain", "domain")
    .where("domain.id = :domainId", { domainId: domain.id })
    .andWhere("dep.deletedAt IS NULL")
    .orderBy("dep.createdAt", "ASC")
    .getOne();

  return {
    universityId: university.id,
    domainId: domain.id,
    departmentId: department?.id,
  };
};

const getProfileByName = async (dataSource: DataSource, name: string) =>
  dataSource
    .getRepository(PermissionProfile)
    .createQueryBuilder("p")
    .where("p.name->>'en' ILIKE :name", { name: `%${name}%` })
    .andWhere("p.deletedAt IS NULL")
    .getOne();

const upsertSpecialization = async (
  dataSource: DataSource,
  nameAr: string,
  nameEn: string,
  descriptionAr?: string,
  descriptionEn?: string,
) => {
  const repo = dataSource.getRepository(Specialization);
  let specialization = await repo
    .createQueryBuilder("s")
    .where("(s.name->>'en' = :nameEn OR s.name->>'ar' = :nameAr)", {
      nameEn,
      nameAr,
    })
    .andWhere("s.deletedAt IS NULL")
    .getOne();

  if (!specialization) {
    specialization = repo.create({
      name: { en: nameEn, ar: nameAr },
      description: {
        en: descriptionEn || nameEn,
        ar: descriptionAr || nameAr,
      },
      review_required: false,
    });
  } else {
    specialization.description = {
      en: descriptionEn || specialization.description?.en || nameEn,
      ar: descriptionAr || specialization.description?.ar || nameAr,
    };
  }

  return repo.save(specialization);
};

const upsertProblem = async (
  dataSource: DataSource,
  specialization: Specialization,
  nameAr: string,
  nameEn: string,
  descriptionAr?: string,
  descriptionEn?: string,
) => {
  const repo = dataSource.getRepository(Problem);
  let problem = await repo
    .createQueryBuilder("p")
    .innerJoin("p.specialization", "s")
    .where("s.id = :specializationId", { specializationId: specialization.id })
    .andWhere("(p.name->>'en' = :nameEn OR p.name->>'ar' = :nameAr)", {
      nameEn,
      nameAr,
    })
    .andWhere("p.deletedAt IS NULL")
    .getOne();

  if (!problem) {
    problem = repo.create({
      name: { en: nameEn, ar: nameAr },
      description: {
        en: descriptionEn || nameEn,
        ar: descriptionAr || nameAr,
      },
      review_required: false,
      specialization,
    });
  } else {
    problem.description = {
      en: descriptionEn || problem.description?.en || nameEn,
      ar: descriptionAr || problem.description?.ar || nameAr,
    };
    problem.specialization = specialization;
  }

  return repo.save(problem);
};

const seedSpecializationsAndProblems = async (
  dataSource: DataSource,
  sysDataDir: string,
) => {
  const worksheet = await readWorkbook(
    path.join(sysDataDir, SYS_DATA_FILES.specializationProblems),
  );
  const headers = buildHeaderMap(worksheet);
  let specializationsTouched = 0;
  let problemsTouched = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const specAr = getCellByHeader(row, headers, ["name ar"]);
    const specEn = getCellByHeader(row, headers, ["name en"]);
    const problemAr = getCellByHeader(row, headers, ["problem name ar"]);
    const problemEn = getCellByHeader(row, headers, ["problem name en"]);

    if (!specAr || !specEn) continue;

    const specialization = await upsertSpecialization(
      dataSource,
      specAr,
      specEn,
      getCellByHeader(row, headers, ["description ar"]),
      getCellByHeader(row, headers, ["description en"]),
    );
    specializationsTouched++;

    if (problemAr && problemEn) {
      await upsertProblem(dataSource, specialization, problemAr, problemEn);
      problemsTouched++;
    }
  }

  console.log(
    `[SysDataSeed] Specializations touched=${specializationsTouched}, problems touched=${problemsTouched}`,
  );
};

const buildUserLookup = (users: User[]) => {
  const lookup = new Map<string, User>();

  for (const user of users) {
    const names = [
      user.fullName?.en,
      user.fullName?.ar,
      [user.firstName?.en, user.midName?.en, user.lastName?.en]
        .filter(Boolean)
        .join(" "),
      [user.firstName?.ar, user.midName?.ar, user.lastName?.ar]
        .filter(Boolean)
        .join(" "),
      user.email,
    ].filter(Boolean) as string[];

    for (const name of names) {
      lookup.set(normalizeComparable(name), user);
    }
  }

  return lookup;
};

const findUserByName = (lookup: Map<string, User>, rawName: string) => {
  const normalized = normalizeComparable(rawName);
  if (!normalized) return null;
  if (lookup.has(normalized)) return lookup.get(normalized)!;

  for (const [candidate, user] of lookup) {
    if (candidate.includes(normalized) || normalized.includes(candidate)) {
      return user;
    }
  }

  return null;
};

const seedTechniciansFromSheet = async (
  dataSource: DataSource,
  sysDataDir: string,
  organization: OrganizationDefaults,
  technicianProfile: PermissionProfile | null,
) => {
  if (!technicianProfile) {
    console.warn("[SysDataSeed] Technician permission profile not found; skipping technicians.");
    return 0;
  }

  const worksheet = await readWorkbook(path.join(sysDataDir, SYS_DATA_FILES.technicians));
  const headers = buildHeaderMap(worksheet);
  const userRepo = dataSource.getRepository(User);
  let created = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const email = getCellByHeader(row, headers, ["email"]).toLowerCase();
    if (!email) continue;

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) continue;

    const fullNameEn = getCellByHeader(row, headers, ["full name en"]) || englishNameFromEmail(email);
    const fullNameAr = getCellByHeader(row, headers, ["full name ar"]) || fullNameEn;
    const enName = splitName(fullNameEn);
    const arName = splitName(fullNameAr);
    const ssn = getCellByHeader(row, headers, ["ssn"]) || `30${String(rowNumber).padStart(12, "0")}`;
    const mobile = getCellByHeader(row, headers, ["mobile"]);

    const dto: CreateTechnicianMapped = {
      email,
      password: "Tech@123456",
      userType: UserType.TECHNICIAN,
      firstNameEn: getCellByHeader(row, headers, ["first name en"]) || enName.first,
      midNameEn: getCellByHeader(row, headers, ["middle name en"]) || enName.mid,
      lastNameEn: getCellByHeader(row, headers, ["last name en"]) || enName.last,
      firstNameAr: getCellByHeader(row, headers, ["first name ar"]) || arName.first,
      midNameAr: getCellByHeader(row, headers, ["middle name ar"]) || arName.mid,
      lastNameAr: getCellByHeader(row, headers, ["last name ar"]) || arName.last,
      fullNameEn,
      fullNameAr,
      ssn,
      university: organization.universityId,
      domain: organization.domainId,
      phones: mobile ? [mobile] : [],
      mobiles: mobile ? [mobile] : [],
      allowedSpecializations: [],
      permissionProfile: technicianProfile.id,
      extraPermissions: [],
      revokedPermissions: [],
      jobEn: "Support Technician",
      jobAr: "Support Technician",
    };

    const result = await createTechnicianService(dto);
    if (result.is_added) {
      created++;
    } else {
      console.warn(`[SysDataSeed] Technician skipped: ${email}`, result.errors);
    }
  }

  console.log(`[SysDataSeed] Technicians created=${created}`);
  return created;
};

const seedEmployeesFromCsv = async (
  dataSource: DataSource,
  sysDataDir: string,
  organization: OrganizationDefaults,
  requesterProfile: PermissionProfile | null,
) => {
  if (!requesterProfile || !organization.departmentId) {
    console.warn("[SysDataSeed] Requester profile or default department missing; skipping employees.");
    return 0;
  }

  const filePath = path.join(sysDataDir, SYS_DATA_FILES.employees);
  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/);
  const userRepo = dataSource.getRepository(User);
  let created = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    const [rawEmail, rawNameAr, rawSsn, rawMobile] = line
      .split(",")
      .map((item) => normalizeWhitespace(item || ""));
    const email = rawEmail.toLowerCase();
    if (!email || !email.includes("@")) continue;

    const existing = await userRepo.findOne({ where: { email } });
    if (existing) continue;

    const fullNameEn = englishNameFromEmail(email);
    const fullNameAr = rawNameAr || fullNameEn;
    const enName = splitName(fullNameEn);
    const arName = splitName(fullNameAr);

    const dto: CreateRequesterMapped = {
      email,
      password: "Requester@123456",
      userType: UserType.REQUESTER,
      firstNameEn: enName.first,
      midNameEn: enName.mid,
      lastNameEn: enName.last,
      firstNameAr: arName.first,
      midNameAr: arName.mid,
      lastNameAr: arName.last,
      fullNameEn,
      fullNameAr,
      ssn: rawSsn || `20${String(created + 1).padStart(12, "0")}`,
      university: organization.universityId,
      domain: organization.domainId,
      departments: [organization.departmentId],
      phones: rawMobile ? [rawMobile] : [],
      mobiles: rawMobile ? [rawMobile] : [],
      allowedSpecializations: [],
      permissionProfile: requesterProfile.id,
      extraPermissions: [],
      revokedPermissions: [],
      jobEn: "Employee",
      jobAr: "Employee",
    };

    const result = await createRequesterService(dto);
    if (result.is_added) {
      created++;
    } else {
      console.warn(`[SysDataSeed] Employee skipped: ${email}`, result.errors);
    }
  }

  console.log(`[SysDataSeed] Requesters created=${created}`);
  return created;
};

const upsertGroup = async (
  dataSource: DataSource,
  nameAr: string,
  nameEn: string,
  descriptionAr: string,
  descriptionEn: string,
  index: number,
) => {
  const groupRepo = dataSource.getRepository(Group);
  let group = await groupRepo
    .createQueryBuilder("g")
    .where("(g.name->>'en' = :nameEn OR g.name->>'ar' = :nameAr)", {
      nameEn,
      nameAr,
    })
    .andWhere("g.deletedAt IS NULL")
    .getOne();

  if (!group) {
    group = groupRepo.create({
      name: { en: nameEn, ar: nameAr },
      descriptions: {
        en: descriptionEn || nameEn,
        ar: descriptionAr || nameAr,
      },
      color: GROUP_COLORS[index % GROUP_COLORS.length],
    });
  } else {
    group.name = { en: nameEn, ar: nameAr };
    group.descriptions = {
      en: descriptionEn || group.descriptions?.en || nameEn,
      ar: descriptionAr || group.descriptions?.ar || nameAr,
    };
  }

  return groupRepo.save(group);
};

const seedGroupsFromSheet = async (
  dataSource: DataSource,
  sysDataDir: string,
  users: User[],
) => {
  const worksheet = await readWorkbook(path.join(sysDataDir, SYS_DATA_FILES.groups));
  const headers = buildHeaderMap(worksheet);
  const userLookup = buildUserLookup(users);
  const headRepo = dataSource.getRepository(GroupHead);
  const groupSpecRepo = dataSource.getRepository(GroupSpecialization);
  const specRepo = dataSource.getRepository(Specialization);
  let touched = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const nameAr = getCellByHeader(row, headers, ["name arabic"]);
    const nameEn = getCellByHeader(row, headers, ["name english"]);
    if (!nameAr || !nameEn) continue;

    const group = await upsertGroup(
      dataSource,
      nameAr,
      nameEn,
      getCellByHeader(row, headers, ["description arabic"]),
      getCellByHeader(row, headers, ["description english"]),
      rowNumber,
    );
    touched++;

    const heads = splitList(getCellByHeader(row, headers, ["heads"]));
    for (const headName of heads) {
      const headUser = findUserByName(userLookup, headName);
      if (!headUser) continue;
      await ensureRelation(
        headRepo,
        { group: { id: group.id }, user: { id: headUser.id } },
        { group, user: headUser },
      );
    }

    const specializations = splitList(
      getCellByHeader(row, headers, ["specializations"]),
    );
    for (const specName of specializations) {
      const specialization = await specRepo
        .createQueryBuilder("s")
        .where("(s.name->>'en' ILIKE :name OR s.name->>'ar' ILIKE :name)", {
          name: specName,
        })
        .andWhere("s.deletedAt IS NULL")
        .getOne();
      if (!specialization) continue;
      await ensureRelation(
        groupSpecRepo,
        { group: { id: group.id }, specialization: { id: specialization.id } },
        { group, specialization },
      );
    }
  }

  console.log(`[SysDataSeed] Groups touched=${touched}`);
};

const findGroupByName = async (
  dataSource: DataSource,
  nameAr: string,
  nameEn: string,
) =>
  dataSource
    .getRepository(Group)
    .createQueryBuilder("g")
    .where("(g.name->>'en' = :nameEn OR g.name->>'ar' = :nameAr)", {
      nameEn,
      nameAr,
    })
    .andWhere("g.deletedAt IS NULL")
    .getOne();

const upsertTeam = async (dataSource: DataSource, group: Group, teamName: string) => {
  const teamRepo = dataSource.getRepository(Team);
  let team = await teamRepo
    .createQueryBuilder("team")
    .innerJoin("team.group", "group")
    .where("group.id = :groupId", { groupId: group.id })
    .andWhere("(team.name->>'en' = :name OR team.name->>'ar' = :name)", {
      name: teamName,
    })
    .andWhere("team.deletedAt IS NULL")
    .getOne();

  if (!team) {
    team = teamRepo.create({
      group,
      name: { en: teamName, ar: teamName },
    });
  }

  return teamRepo.save(team);
};

const seedTeamsFromSheet = async (
  dataSource: DataSource,
  sysDataDir: string,
  users: User[],
) => {
  const worksheet = await readWorkbook(path.join(sysDataDir, SYS_DATA_FILES.teams));
  const headers = buildHeaderMap(worksheet);
  const userLookup = buildUserLookup(users);
  const technicianGroupRepo = dataSource.getRepository(TechnicianGroup);
  const teamLeadRepo = dataSource.getRepository(TeamLead);
  const teamTechnicianRepo = dataSource.getRepository(TeamTechnician);
  let touched = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const groupAr = getCellByHeader(row, headers, ["name arabic"]);
    const groupEn = getCellByHeader(row, headers, ["name english"]);
    const teamName =
      getCellByHeader(row, headers, ["teams"]) || groupEn || groupAr;
    if (!groupAr && !groupEn) continue;

    const group =
      (await findGroupByName(dataSource, groupAr, groupEn)) ||
      (await upsertGroup(
        dataSource,
        groupAr || groupEn,
        groupEn || groupAr,
        getCellByHeader(row, headers, ["description arabic"]),
        getCellByHeader(row, headers, ["description english"]),
        rowNumber,
      ));

    const team = await upsertTeam(dataSource, group, teamName);
    touched++;

    const leadUser = findUserByName(
      userLookup,
      getCellByHeader(row, headers, ["team lead"]),
    );
    if (leadUser) {
      await ensureRelation(
        technicianGroupRepo,
        { group: { id: group.id }, user: { id: leadUser.id } },
        { group, user: leadUser },
      );
      await ensureRelation(
        teamLeadRepo,
        { team: { id: team.id }, user: { id: leadUser.id } },
        { team, user: leadUser },
      );
    }

    const technicianUser = findUserByName(
      userLookup,
      getCellByHeader(row, headers, ["technicains", "technicians"]),
    );
    if (technicianUser) {
      await ensureRelation(
        technicianGroupRepo,
        { group: { id: group.id }, user: { id: technicianUser.id } },
        { group, user: technicianUser },
      );
      await ensureRelation(
        teamTechnicianRepo,
        { team: { id: team.id }, user: { id: technicianUser.id } },
        { team, user: technicianUser },
      );
    }
  }

  console.log(`[SysDataSeed] Teams touched=${touched}`);
};

const getAssignableUsers = (dataSource: DataSource) =>
  dataSource.getRepository(User).find({
    where: [
      { user_type: UserType.ADMIN as any, deletedAt: null },
      { user_type: UserType.SUPER_ADMIN as any, deletedAt: null },
      { user_type: UserType.TECHNICIAN as any, deletedAt: null },
    ],
  });

export async function seedSysData(
  dataSource: DataSource = PostgresDataSource,
  options: SeedSysDataOptions = {},
) {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const sysDataDir = resolveSysDataDir(options.sysDataDir);
  if (!sysDataDir) {
    const message = "[SysDataSeed] sys_data directory not found. Set SYS_DATA_DIR or run from the api folder.";
    if (options.strict) throw new Error(message);
    console.warn(message);
    return;
  }

  const missingFiles = Object.values(SYS_DATA_FILES).filter(
    (fileName) => !fs.existsSync(path.join(sysDataDir, fileName)),
  );
  if (missingFiles.length) {
    const message = `[SysDataSeed] Missing sys_data files: ${missingFiles.join(", ")}`;
    if (options.strict) throw new Error(message);
    console.warn(message);
    return;
  }

  console.log(`[SysDataSeed] Using data from ${sysDataDir}`);

  const organization = await getOrganizationDefaults(dataSource);
  if (!organization) {
    throw new Error("[SysDataSeed] No university/domain exists. Seed universities and domains first.");
  }

  const [technicianProfile, requesterProfile] = await Promise.all([
    getProfileByName(dataSource, "Technician"),
    getProfileByName(dataSource, "Requester"),
  ]);

  await seedSpecializationsAndProblems(dataSource, sysDataDir);
  await seedTechniciansFromSheet(dataSource, sysDataDir, organization, technicianProfile);
  await seedEmployeesFromCsv(dataSource, sysDataDir, organization, requesterProfile);

  const assignableUsers = await getAssignableUsers(dataSource);
  await seedGroupsFromSheet(dataSource, sysDataDir, assignableUsers);
  await seedTeamsFromSheet(dataSource, sysDataDir, assignableUsers);

  console.log("[SysDataSeed] Completed.");
}

const isMain =
  process.argv[1]?.endsWith("sys-data.seed.ts") ||
  process.argv[1]?.endsWith("sys-data.seed.js");

if (isMain) {
  seedSysData(PostgresDataSource, { strict: true })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("[SysDataSeed] Failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      if (PostgresDataSource.isInitialized) {
        await PostgresDataSource.destroy();
      }
    });
}
