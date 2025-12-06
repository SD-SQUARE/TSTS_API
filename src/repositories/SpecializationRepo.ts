import { PostgresDataSource } from "../database/postgres-data-source.js";
import {Specialization} from "../entities/Specialization.js";

export class SpecializationRepo {
    private repo = PostgresDataSource.getRepository(Specialization);
    getRepository() {
    return this.repo;
    }
    }