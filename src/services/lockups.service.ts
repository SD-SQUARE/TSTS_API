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

interface UsersLockupQuery {
  first_name?: string;
  mid_name?: string;
  last_name?: string;
  user_type?: string;
  page?: number;
  limit?: number;
}

interface UniversitiesLockupQuery extends PaginationMeta, PaginationQuery {
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

export const getUsersLockupService = async (query: UsersLockupQuery) => {
  const { skip, take } = buildPagination({
    page: query.page,
    limit: query.limit,
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

  qb.skip(skip).take(take);

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
  category?: string;
  page?: number;
  limit?: number;
}

export const getPermissionsLockupService = async (
  query: PermissionsLockupQuery
) => {
  const { skip, take } = buildPagination({
    page: query.page,
    limit: query.limit,
  });

  const qb = permissionsRepository.createQueryBuilder("permission");

  if (query.name) {
    qb.andWhere(
      `permission.code ILIKE :name OR permission.description->>'en' ILIKE :name OR permission.description->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  if (query.category) {
    qb.andWhere(`permission.category ILIKE :category`, {
      category: `%${query.category}%`,
    });
  }

  const total = await qb.getCount();
  const permissions = await qb.skip(skip).take(take).getMany();

  const mappedPermissions = permissions.map((p) => ({
    id: p.id,
    name_en: p.code || "",
    name_ar: p.code || "", // assuming code is the same for both languages, or adapt as needed
    description_en: p.description?.en || "",
    description_ar: p.description?.ar || "",
    category: p.category || "",
  }));

  return {
    permissions: mappedPermissions,
  };
};

export const getUniversitiesLockupService = async (query) => {
  const { skip, take } = buildPagination({
    page: query.page,
    limit: query.limit,
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
    limit: query.limit,
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
    limit: query.limit,
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
    limit: query.limit,
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
    limit: query.limit,
  });

  const qb = groupsRepository.createQueryBuilder("group");

  if (query.name) {
    qb.andWhere(
      `group.name->>'en' ILIKE :name OR group.name->>'ar' ILIKE :name`,
      { name: `%${query.name}%` }
    );
  }

  const [groups] = await qb.skip(skip).take(take).getManyAndCount();

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
    limit: query.limit,
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
    limit: query.limit,
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

export const getUserTicketsLockupService = async (userId: string) => {
  const tickets = await ticketsRepository
    .createQueryBuilder("ticket")
    .leftJoinAndSelect("ticket.requester", "requester")
    .leftJoinAndSelect("ticket.specialization", "specialization")
    .leftJoinAndSelect("ticket.assigneeList", "assignee")
    .where("requester.id = :userId", { userId })
    .orWhere("assignee.id = :userId", { userId })
    .orderBy("ticket.createdAt", "DESC")
    .getMany();

  return tickets.map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
  }));
};
