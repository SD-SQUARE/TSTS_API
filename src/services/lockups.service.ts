import { User } from "../entities/User.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import {
  buildPagination,
  PaginationMeta,
  PaginationQuery,
} from "../utils/pagination.js";
import { Permission } from "../entities/Permission.js";
import { University } from "../entities/University.js";
import { Domain } from "../entities/Domain.js";
import { Department } from "../entities/Department.js";
import { Specialization } from "../entities/Specialization.js";
import { Group } from "../entities/Group.js";
import { Ticket } from "../entities/Ticket.js";
import { PermissionProfile } from "../entities/PermissionProfile.js";
import { ProblemRepo } from "../repositories/ProblemRepo.js";
import { log } from "console";
import logger from "../utils/logger.js";


interface UsersLockupQuery {
  first_name?: string;
  mid_name?: string;
  last_name?: string;
  user_type?: string;
  page?: number;
  page_size?: number;
} 


interface UniversitiesLockupQuery extends PaginationMeta, PaginationQuery {
  page_size: number;
  name?: string;
}

interface DomainsLockupQuery extends PaginationQuery {
  name?: string;
  university?: string;
}

interface DepartmentsLockupQuery extends PaginationQuery {
  name?: string;
  university?: string;
  domain?: string;
}

interface SpecializationsLockupQuery extends PaginationQuery {
  name?: string;
}

interface GroupsLockupQuery extends PaginationQuery {
  name?: string;
}

interface UniversityDomainsLockupQuery extends PaginationQuery {
  name?: string;
  universityId: string;
}

interface DomainDepartmentsLockupQuery extends PaginationQuery {
  name?: string;
  domainId: string;
}

interface GroupTechniciansQuery extends PaginationQuery {
  name?: string;
  job?: string;
}

const usersRepository = PostgresDataSource.getRepository(User);
const permissionsRepository = PostgresDataSource.getRepository(Permission);
const universitiesRepository = PostgresDataSource.getRepository(University);
const domainsRepository = PostgresDataSource.getRepository(Domain);
const departmentsRepository = PostgresDataSource.getRepository(Department);
const specializationsRepository =
  PostgresDataSource.getRepository(Specialization);
const groupsRepository = PostgresDataSource.getRepository(Group);
const ticketsRepository = PostgresDataSource.getRepository(Ticket);
const problemRepo = new ProblemRepo().getRepository();
const PermissionProfileRepo = PostgresDataSource.getRepository(PermissionProfile);

export const getUsersLockupService = async (query: UsersLockupQuery) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  // Build query
  const qb = usersRepository
    .createQueryBuilder("user")
    .where("user.user_type != :superAdmin", { superAdmin: "SuperAdmin" });

  // Filters
  if (query.first_name) {
    qb.andWhere(
      `("user"."firstName"->>'en' ILIKE :first_name OR "user"."firstName"->>'ar' ILIKE :first_name)`,
      { first_name: `%${query.first_name}%` }
    );
  }

  if (query.mid_name) {
    qb.andWhere(
      `("user"."midName"->>'en' ILIKE :mid_name OR "user"."midName"->>'ar' ILIKE :mid_name)`,
      { mid_name: `%${query.mid_name}%` }
    );
  }

  if (query.last_name) {
    qb.andWhere(
      `("user"."lastName"->>'en' ILIKE :last_name OR "user"."lastName"->>'ar' ILIKE :last_name)`,
      { last_name: `%${query.last_name}%` }
    );
  }

  if (query.user_type) {
    qb.andWhere("user.user_type = :user_type", { user_type: query.user_type });
  }

  // qb.skip(skip).take(take);

  // Get paginated results
  const users = await qb.getMany();

  return {
    users: users.map((u) => ({
      id: u.id,
      image: u.image || "",
      email: u.email,
      first_name: u.firstName?.en || "",
      mid_name: u.midName?.en || "",
      last_name: u.lastName?.en || "",
      user_type: u.user_type || "",
      status: u.status,
    })),
  };
};

interface PermissionsLockupQuery {
  name?: string;
  page?: number;
  page_size?: number;
}

export const getPermissionsLockupService = async (
  query: PermissionsLockupQuery
) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = permissionsRepository.createQueryBuilder("permission");

  if (query.name) {
    qb.andWhere(
      `permission.name->>'en' ILIKE :name OR permission.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  

  const total = await qb.getCount();
  const permissions = await qb.skip(skip).take(take).getMany();

  const mappedPermissions = permissions.map((p) => ({
    id: p.id,
    name_en: p.name?.en || "",
    name_ar: p.name?.ar || "",
  }));

  return {
    permissions: mappedPermissions,
  };
};

export const getUniversitiesLockupService = async (query) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = universitiesRepository.createQueryBuilder("university");

  if (query.name) {
    qb.andWhere(
      `university.name->>'en' ILIKE :name OR university.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  const [universities] = await qb.skip(skip).take(take).getManyAndCount();

  return universities.map((u) => ({
    id: u.id,
    name: u.name?.en || "",
    description: u.description?.en || "",
  }));
};

export const getDomainsLockupService = async (query: DomainsLockupQuery) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = domainsRepository
    .createQueryBuilder("domain")
    .leftJoinAndSelect("domain.university", "university");

  if (query.name) {
    qb.andWhere(
      `domain.name->>'en' ILIKE :name OR domain.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  if (query.university) {
    qb.andWhere("university.id = :universityId", {
      universityId: query.university,
    });
  }

  const [domains] = await qb.skip(skip).take(take).getManyAndCount();

  return domains.map((d) => ({
    id: d.id,
    name: d.name?.en || "",
    description: d.description?.en || "",
  }));
};

export const getDepartmentsLockupService = async (
  query: DepartmentsLockupQuery
) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = departmentsRepository
    .createQueryBuilder("department")
    .leftJoinAndSelect("department.domain", "domain")
    .leftJoinAndSelect("domain.university", "university");

  if (query.name) {
    qb.andWhere(
      `department.name->>'en' ILIKE :name OR department.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  if (query.university) {
    qb.andWhere("university.id = :universityId", {
      universityId: query.university,
    });
  }

  if (query.domain) {
    qb.andWhere("domain.id = :domainId", { domainId: query.domain });
  }

  const [departments] = await qb.skip(skip).take(take).getManyAndCount();

  return departments.map((d) => ({
    id: d.id,
    name: d.name?.en || "",
    description: d.description?.en || "",
  }));
};

export const getSpecializationsLockupService = async (
  query: SpecializationsLockupQuery
) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = specializationsRepository.createQueryBuilder("specialization");

  if (query.name) {
    qb.andWhere(
      `specialization.name->>'en' ILIKE :name OR specialization.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  const [specializations] = await qb.skip(skip).take(take).getManyAndCount();

  return specializations.map((s) => ({
    id: s.id,
    name: s.name?.en || "",
    description: s.description?.en || "",
  }));
};

export const getGroupsLockupService = async (query: GroupsLockupQuery) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = groupsRepository.createQueryBuilder("group");

  if (query.name) {
    qb.andWhere(
      `group.name->>'en' ILIKE :name OR group.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  // const [groups] = await qb.skip(skip).take(take).getManyAndCount();
  const [groups] = await qb.getManyAndCount();

  return groups.map((g) => ({
    id: g.id,
    name: g.name?.en || "",
    description: g.descriptions?.en || "",
    color: g.color || "",
  }));
};

export const getUniversityDomainsLockupService = async (
  universityId: string,
  query
) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = domainsRepository
    .createQueryBuilder("domain")
    .where("domain.universityId = :universityId", { universityId });

  if (query.name) {
    qb.andWhere(
      `domain.name->>'en' ILIKE :name OR domain.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  const [domains] = await qb.skip(skip).take(take).getManyAndCount();

  return domains.map((d) => ({
    id: d.id,
    name: d.name?.en || "",
    description: d.description?.en || "",
  }));
};

export const getDomainDepartmentsLockupService = async (
  domainId: string,
  query
) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = departmentsRepository
    .createQueryBuilder("department")
    .where("department.domainId = :domainId", { domainId });

  if (query.name) {
    qb.andWhere(
      `department.name->>'en' ILIKE :name OR department.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  const [departments] = await qb.skip(skip).take(take).getManyAndCount();

  return departments.map((d) => ({
    id: d.id,
    name: d.name?.en || "",
    description: d.description?.en || "",
  }));
};

export const getGroupTechniciansLockupService = async (
  groupId: string,
  query: GroupTechniciansQuery
) => {
  const qb = groupsRepository
    .createQueryBuilder("group")
    .leftJoin("group.technicians", "tg")
    .leftJoin("tg.user", "user")
    .where("group.id = :groupId", { groupId })
    .select([
      "user.id AS id",
      "user.firstName AS firstName",
      "user.midName AS midName",
      "user.lastName AS lastName",
      "user.job AS job",
    ]);

  if (query.name) {
    qb.andWhere(
      `(
          user."firstName"->>'en' ILIKE :name OR user."firstName"->>'ar' ILIKE :name OR
          user."midName"->>'en' ILIKE :name OR user."midName"->>'ar' ILIKE :name OR
          user."lastName"->>'en' ILIKE :name OR user."lastName"->>'ar' ILIKE :name
      )`,
      { name: `%${query.name}%` }
    );
  }

  if (query.job) {
    qb.andWhere(
      `(
          user."job"->>'en' ILIKE :job OR
          user."job"->>'ar' ILIKE :job
      )`,
      { job: `%${query.job}%` }
    );
  }

  const rows = await qb.getRawMany();

  return rows.map((t) => ({
    id: t.id,
    first_name: t.firstname,
    mid_name: t.midname,
    last_name: t.lastname,
    job_title: t.job,
  }));
};

export const getGroupNonTechniciansLockupService = async (
  groupId: string,
  query: GroupTechniciansQuery
) => {
  const qb = usersRepository
    .createQueryBuilder("user")
    .where("user.user_type = :type", { type: "Technician" })
    .andWhere(
      `
      user.id NOT IN (
        SELECT tg."userId" 
        FROM technician_groups tg 
        WHERE tg."groupId" = :groupId
      )
    `,
      { groupId }
    )
    .select([
      "user.id AS id",
      "user.firstName AS firstName",
      "user.midName AS midName",
      "user.lastName AS lastName",
      "user.job AS job",
    ]);

  if (query.name) {
    qb.andWhere(
      `(
        user."firstName"->>'en' ILIKE :name OR user."firstName"->>'ar' ILIKE :name OR
        user."midName"->>'en' ILIKE :name OR user."midName"->>'ar' ILIKE :name OR
        user."lastName"->>'en' ILIKE :name OR user."lastName"->>'ar' ILIKE :name
      )`,
      { name: `%${query.name}%` }
    );
  }

  if (query.job) {
    qb.andWhere(
      `(user."job"->>'en' ILIKE :job OR user."job"->>'ar' ILIKE :job)`,
      { job: `%${query.job}%` }
    );
  }

  const rows = await qb.getRawMany();

  return rows.map((t) => ({
    id: t.id,
    first_name: t.firstname,
    mid_name: t.midname,
    last_name: t.lastname,
    job_title: t.job,
  }));
};

export const getUserTicketsLockupService = async (
  userId: string,
  lang: "ar" | "en",
) => {
  const tickets = await ticketsRepository
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("ticket.problem", "problem")
    .leftJoinAndSelect("ticket.assigneeList", "assignee")
    .where("requester.id = :userId", { userId })
    .orWhere("assignee.id = :userId", { userId })
    .orderBy("ticket.createdAt", "DESC")
    .getMany();

  return tickets.map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    specialization: ticket.specialization
      ? {
          id: ticket.specialization.id,
          name: ticket.specialization.name?.[lang] || "",
        }
      : null,
    problem: ticket.problem
      ? {
          id: ticket.problem.id,
          name: ticket.problem.name?.[lang] || "",
        }
      : null,
    status: ticket.status,
  }));
};
export const getProblemsLockUpService = async (
  name: string | undefined,
  lang: "en" | "ar",
  specializationId: string
) => {
  const qb = problemRepo
    .createQueryBuilder("problem")
    .innerJoin("problem.specialization", "specialization")
    .where("specialization.id = :specializationId", { specializationId });

  const searchTerm = name?.trim();
  if (searchTerm) {
    qb.andWhere(
      `problem.name->>:lang ILIKE :name`,
      {
        lang,
        name: `%${searchTerm}%`,
      }
    );
  }

  const problems = await qb
    .select([
      "problem.id AS problem_id",
      `problem.name->>:lang AS name`,
    ])
    .setParameter("lang", lang)
    .getRawMany();

  return {
    problems: problems.map(({ problem_id: id, name }) => ({
      id,
      name,
    })),
  };
};
export const getTicketProblemsService = async (
  specializationId: string | undefined,
  specializationName: string | undefined,
  lang: "en" | "ar"
) => {
  if (!["en", "ar"].includes(lang)) throw new Error("Invalid language");

  const key = lang;
  const qb = specializationsRepository
    .createQueryBuilder("specialization")
    .leftJoin("specialization.problems", "problem")  
    .where("specialization.deletedAt IS NULL");     

  if (specializationId) {
    qb.andWhere("specialization.id = :id", { id: specializationId });
  }
  if (specializationName?.trim()) {
    qb.andWhere(`specialization.name->>'${key}' ILIKE :name`, {
      name: `%${specializationName.trim()}%`,
    });
  }

  const rows = await qb
    .select([
      "specialization.id AS specialization_id",
      `specialization.name->>'${key}' AS specialization_name`,
      "problem.id AS problem_id",
      `problem.name->>'${key}' AS problem_name`,
    ])
    .getRawMany();

  return {
    specializations: Object.values(
      rows.reduce((map: any, row: any) => {
        const specId = row.specialization_id;
        if (!map[specId]) {
          map[specId] = { id: specId, name: row.specialization_name || 'No name', problems: [] };
        }
        if (row.problem_id) {
          map[specId].problems.push({ id: row.problem_id, name: row.problem_name || 'No name' });
        }
        return map;
      }, {})
    ),
  };
};
export const getPermissionProfilesLockupService = async (query: PermissionsLockupQuery) => {
  const { skip, take } = buildPagination({
    page: query.page,
    page_size: query.page_size,
  });

  const qb = PermissionProfileRepo
    .createQueryBuilder("permission_profile")
    .leftJoinAndSelect("permission_profile.permissions", "permission");

  if (query.name) {
    qb.andWhere(
      `permission_profile.name->>'en' ILIKE :name OR permission_profile.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  const total = await qb.getCount();
  const profiles = await qb
    .skip(skip)
    .take(take)
    .getMany();
  const mappedProfiles = profiles.map((p) => ({
    id: p.id,
    name_en: p.name?.en || "",
    name_ar: p.name?.ar || "",
    description_en: p.descriptions?.en || "",
    description_ar: p.descriptions?.ar || "",
    permissions: p.permissions.map((perm) => ({
      Key: perm.key,
      name_en: perm.name?.en || "",
      name_ar: perm.name?.ar || "",
    })),
  }));

  return mappedProfiles;
};
   