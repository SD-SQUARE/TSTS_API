import { PostgresDataSource } from "../database/postgres-data-source.js";
import { PermissionProfile } from "../entities/PermissionProfile.js";

export class PermissionProfileRepo {
    private repo= PostgresDataSource.getRepository(PermissionProfile);
    getRepository() {
    return this.repo;
    }
}    