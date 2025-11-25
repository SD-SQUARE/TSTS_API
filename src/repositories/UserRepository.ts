import { Not } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { User } from "../entities/User.js";
import { EmailSsnConflictResult } from "../interfaces/users/IEmailAndSsnConflict.js";
import { GetUsersQuery } from "../interfaces/users/IGetUsersQuery.js";
import { UserType } from "../enums/UserType.enum.js";
import { IPagination } from "../interfaces/shared/IPagination.js";
import { parsePageIndex, parsePageSize } from "../helpers/paginationHelper.js";
import { TechnicianGroup } from "../entities/TechnicianGroup.js";
import { GroupDto, toGroupDto } from "../mappers/groups/toGroupDto.js";
import { Group } from "../entities/Group.js";
import { AllowedSpecialization, Specialization } from "../entities/index.js";

export class UserRepository {
  private repo = PostgresDataSource.getRepository(User);

  getRepository() {
    return this.repo;
  }

  async checkEmailOrSsnConflictForAdd(
    email: string,
    ssn?: string
  ): Promise<EmailSsnConflictResult> {
    const emailExists = await this.repo.exists({ where: { email } });
    const ssnExists = ssn ? await this.repo.exists({ where: { ssn } }) : false;

    if (emailExists && ssnExists) {
      return { status: "both", email: true, ssn: true };
    }

    if (emailExists) {
      return { status: "email", email: true, ssn: false };
    }

    if (ssnExists) {
      return { status: "ssn", email: false, ssn: true };
    }

    return { status: "none", email: false, ssn: false };
  }

  async checkEmailOrSsnConflictForEdit(
    id: string,
    email: string,
    ssn?: string
  ): Promise<EmailSsnConflictResult> {
    const emailExists = await this.repo.exists({
      where: { email, id: Not(id) },
    });
    const ssnExists = ssn
      ? await this.repo.exists({ where: { ssn, id: Not(id) } })
      : false;

    if (emailExists && ssnExists) {
      return { status: "both", email: true, ssn: true };
    }

    if (emailExists) {
      return { status: "email", email: true, ssn: false };
    }

    if (ssnExists) {
      return { status: "ssn", email: false, ssn: true };
    }

    return { status: "none", email: false, ssn: false };
  }

  async createAndSave(userData: Partial<User>): Promise<User> {
    const user = this.repo.create(userData);
    return this.repo.save(user);
  }

  async getAllRequestersWithFilter(
    query: GetUsersQuery,
    lang: "en" | "ar"
  ): Promise<[User[], number]> {
    const repo = PostgresDataSource.getRepository(User);

    const qb = repo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.university", "university")
      .leftJoinAndSelect("user.domain", "domain")
      .leftJoinAndSelect("user.userDepartments", "userDepartments")
      .leftJoinAndSelect("userDepartments.department", "department")
      .where("1 = 1");

    qb.andWhere("user.user_type = :userType", { userType: UserType.REQUESTER });
    qb.andWhere("user.deletedAt IS NULL");
    qb.orderBy("user.createdAt", "DESC");

    const fn = `"user"."firstName"->>'${lang}'`;
    const mn = `"user"."midName"->>'${lang}'`;
    const ln = `"user"."lastName"->>'${lang}'`;

    // Text search filters
    if (query.first_name) {
      qb.andWhere(`${fn} ILIKE :fn`, { fn: `%${query.first_name}%` });
    }

    if (query.mid_name) {
      qb.andWhere(`${mn} ILIKE :mn`, { mn: `%${query.mid_name}%` });
    }

    if (query.last_name) {
      qb.andWhere(`${ln} ILIKE :ln`, { ln: `%${query.last_name}%` });
    }

    if (query.ssn) {
      qb.andWhere("user.ssn = :ssn", { ssn: query.ssn });
    }

    if (query.user_type) {
      qb.andWhere("user.user_type = :ut", { ut: query.user_type });
    }

    if (query.departments) {
      qb.andWhere("department.id = :dep", { dep: query.departments });
    }

    if (query.universities && query.domains) {
      qb.andWhere("(university.id = :un OR domain.id = :dm)", {
        un: query.universities,
        dm: query.domains,
      });
    } else if (query.universities) {
      qb.andWhere("university.id = :un", { un: query.universities });
    } else if (query.domains) {
      qb.andWhere("domain.id = :dm", { dm: query.domains });
    }

    const pageIndex = Number(query.page_index ?? 1);
    const pageSize = Number(query.page_size ?? 10);
    const skip = (pageIndex - 1) * pageSize;

    qb.skip(skip).take(pageSize);

    return await qb.getManyAndCount();
  }

  async getAllTechniciansWithFilter(
    query: GetUsersQuery,
    lang: "en" | "ar"
  ): Promise<[User[], number]> {
    const repo = PostgresDataSource.getRepository(User);

    const qb = repo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.university", "university")
      .leftJoinAndSelect("user.domain", "domain")
      .leftJoinAndSelect("user.userDepartments", "userDepartments")
      .leftJoinAndSelect("userDepartments.department", "department")
      .where("1 = 1");

    qb.andWhere("user.user_type = :userType", {
      userType: UserType.TECHNICIAN,
    });
    qb.andWhere("user.deletedAt IS NULL");
    qb.orderBy("user.createdAt", "DESC");

    const fn = `"user"."firstName"->>'${lang}'`;
    const mn = `"user"."midName"->>'${lang}'`;
    const ln = `"user"."lastName"->>'${lang}'`;

    // Text search filters
    if (query.first_name) {
      qb.andWhere(`${fn} ILIKE :fn`, { fn: `%${query.first_name}%` });
    }

    if (query.mid_name) {
      qb.andWhere(`${mn} ILIKE :mn`, { mn: `%${query.mid_name}%` });
    }

    if (query.last_name) {
      qb.andWhere(`${ln} ILIKE :ln`, { ln: `%${query.last_name}%` });
    }

    if (query.ssn) {
      qb.andWhere("user.ssn = :ssn", { ssn: query.ssn });
    }

    if (query.user_type) {
      qb.andWhere("user.user_type = :ut", { ut: query.user_type });
    }

    if (query.departments) {
      qb.andWhere("department.id = :dep", { dep: query.departments });
    }

    if (query.universities && query.domains) {
      qb.andWhere("(university.id = :un OR domain.id = :dm)", {
        un: query.universities,
        dm: query.domains,
      });
    } else if (query.universities) {
      qb.andWhere("university.id = :un", { un: query.universities });
    } else if (query.domains) {
      qb.andWhere("domain.id = :dm", { dm: query.domains });
    }

    const pageIndex = Number(query.page_index ?? 1);
    const pageSize = Number(query.page_size ?? 10);
    const skip = (pageIndex - 1) * pageSize;

    qb.skip(skip).take(pageSize);

    return await qb.getManyAndCount();
  }

  async getAllAdminsWithFilter(
    query: GetUsersQuery,
    lang: "en" | "ar"
  ): Promise<[User[], number]> {
    const repo = PostgresDataSource.getRepository(User);

    const qb = repo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.university", "university")
      .leftJoinAndSelect("user.domain", "domain")
      .leftJoinAndSelect("user.userDepartments", "userDepartments")
      .leftJoinAndSelect("userDepartments.department", "department")
      .where("1 = 1");

    qb.andWhere("user.user_type = :userType", {
      userType: UserType.ADMIN,
    });
    qb.andWhere("user.deletedAt IS NULL");
    qb.orderBy("user.createdAt", "DESC");

    const fn = `"user"."firstName"->>'${lang}'`;
    const mn = `"user"."midName"->>'${lang}'`;
    const ln = `"user"."lastName"->>'${lang}'`;

    // Text search filters
    if (query.first_name) {
      qb.andWhere(`${fn} ILIKE :fn`, { fn: `%${query.first_name}%` });
    }

    if (query.mid_name) {
      qb.andWhere(`${mn} ILIKE :mn`, { mn: `%${query.mid_name}%` });
    }

    if (query.last_name) {
      qb.andWhere(`${ln} ILIKE :ln`, { ln: `%${query.last_name}%` });
    }

    if (query.ssn) {
      qb.andWhere("user.ssn = :ssn", { ssn: query.ssn });
    }

    if (query.user_type) {
      qb.andWhere("user.user_type = :ut", { ut: query.user_type });
    }

    if (query.departments) {
      qb.andWhere("department.id = :dep", { dep: query.departments });
    }

    if (query.universities && query.domains) {
      qb.andWhere("(university.id = :un OR domain.id = :dm)", {
        un: query.universities,
        dm: query.domains,
      });
    } else if (query.universities) {
      qb.andWhere("university.id = :un", { un: query.universities });
    } else if (query.domains) {
      qb.andWhere("domain.id = :dm", { dm: query.domains });
    }

    const pageIndex = Number(query.page_index ?? 1);
    const pageSize = Number(query.page_size ?? 10);
    const skip = (pageIndex - 1) * pageSize;

    qb.skip(skip).take(pageSize);

    return await qb.getManyAndCount();
  }

  async getUserTypeByUserId(id) {
    const user = await this.repo.findOne({
      where: { id },
      select: ["user_type"],
    });
    return user?.user_type ?? null;
  }

  async getUserGroups(
    userId: string,
    query?: IPagination
  ): Promise<[Group[], number]> {
    const tgRepo = PostgresDataSource.getRepository(TechnicianGroup);

    const qb = tgRepo
      .createQueryBuilder("tg")
      .leftJoinAndSelect("tg.group", "g")
      .leftJoinAndSelect("tg.user", "u")
      .where("u.id = :userId", { userId })
      .andWhere('u."deletedAt" IS NULL')
      .andWhere("u.user_type != :adminType", {
        adminType: UserType.SUPER_ADMIN,
      });

    const pageIndex = parsePageIndex(query?.page_index);
    const pageSize = parsePageSize(query?.page_size);
    const skip = (pageIndex - 1) * pageSize;

    qb.skip(skip).take(pageSize);
    const [techGroups, total] = await qb.getManyAndCount();

    const groups = await Promise.all(techGroups.map((tg) => tg.group));

    return [groups, total];
  }

  async getUserSpecializations(
    userId: string,
    query?: IPagination
  ): Promise<[Specialization[], number]> {
    const allowedRepo = PostgresDataSource.getRepository(AllowedSpecialization);

    const qb = allowedRepo
      .createQueryBuilder("as")
      .leftJoinAndSelect("as.user", "u")
      .leftJoinAndSelect("as.specialization", "s")
      .where("u.id = :userId", { userId })
      .andWhere('u."deletedAt" IS NULL')
      .andWhere("u.user_type != :adminType", {
        adminType: UserType.SUPER_ADMIN,
      });
    const pageIndex = parsePageIndex(query?.page_index);
    const pageSize = parsePageSize(query?.page_size);
    const skip = (pageIndex - 1) * pageSize;

    qb.skip(skip).take(pageSize);

    const [allowedList, total] = await qb.getManyAndCount();

    // if specialization is lazy, it may be Promise<Specialization>
    const specializations = await Promise.all(
      allowedList.map((a) => a.specialization)
    );

    return [specializations, total];
  }
}
export const userRepository = new UserRepository();
