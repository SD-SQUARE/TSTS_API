import { Not } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { User } from "../entities/User.js";
import { EmailSsnConflictResult } from "../interfaces/users/IEmailAndSsnConflict.js";
import { GetUsersQuery } from "../interfaces/users/IGetUsersQuery.js";

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



  async getAllWithFilter(
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
}

export const userRepository = new UserRepository();
