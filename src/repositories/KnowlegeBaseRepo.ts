import { PostgresDataSource } from "../database/postgres-data-source.js";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";

export class KPRepo {
    private repo = PostgresDataSource.getRepository(KnowledgeItem);
    returnRepo() {
    return this.repo;
    }
    }