import { PostgresDataSource } from "../database/postgres-data-source.js";
import {Problem} from "../entities/problem.js";
export class ProblemRepo  {
    private repo = PostgresDataSource.getRepository(Problem);
    getRepository() {
    return this.repo;
    }
    }