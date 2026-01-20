import { PostgresDataSource } from "../database/postgres-data-source.js";
import { University } from "../entities/University.js";

export class UniversityRepo {
  private repo = PostgresDataSource.getRepository(University);
    returnRepo() {
    return this.repo;
    }
    }