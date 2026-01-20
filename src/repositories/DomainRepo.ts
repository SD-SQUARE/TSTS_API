import { PostgresDataSource } from "../database/postgres-data-source.js";
import {Domain} from "../entities/Domain.js";

export class DomainRepo {
    private repo = PostgresDataSource.getRepository(Domain);
    returnRepo() {
    return this.repo;
    }
    }
