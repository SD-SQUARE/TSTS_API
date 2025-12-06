import { PostgresDataSource } from "../database/postgres-data-source.js";
import { WorkHour } from "../entities/WorkHour.js";
export class WorkHourRepo {
  private repo = PostgresDataSource.getRepository(WorkHour);
    getRepository() {
    return this.repo;
    }
}