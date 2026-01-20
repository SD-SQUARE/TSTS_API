import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Department } from "../entities/Department.js";

export class DepartmentRepo {
  private repo = PostgresDataSource.getRepository(Department);
    getRepository() {
    return this.repo;
  }
}