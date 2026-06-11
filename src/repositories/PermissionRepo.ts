import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Permission } from "../entities/Permission.js";

export class PermissionRepo {
    private repository;
    public getRepository() {
        if (!this.repository) {
            this.repository = PostgresDataSource.getRepository(Permission);
        }
        return this.repository;
    }
}