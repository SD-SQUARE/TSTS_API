import { PostgresDataSource } from "../database/postgres-data-source.js";
import { UserDepartment } from "../entities/UserDepartment.js";
export class UserDepartmentRepo {
  private repo = PostgresDataSource.getRepository(UserDepartment);
  getRepository() {
    return this.repo;
  } 
}


