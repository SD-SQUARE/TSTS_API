import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTicketNumberToTicketsTable1776169034608 implements MigrationInterface {
    name = 'AddTicketNumberToTicketsTable1776169034608'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."knowledge_items_search_idx"`);
        await queryRunner.query(`DROP INDEX "public"."reports_search_vector_idx"`);
        await queryRunner.query(`DROP INDEX "public"."reports_handler_idx"`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD "ticket_number" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tickets" ADD CONSTRAINT "UQ_8d7b9a157280caf57aa0282e72c" UNIQUE ("ticket_number")`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" RENAME COLUMN "search_vector" TO "TEMP_OLD_search_vector"`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" ADD "search_vector" tsvector`);
        await queryRunner.query(`UPDATE "knowledge_items" SET "search_vector" = "TEMP_OLD_search_vector"`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" DROP COLUMN "TEMP_OLD_search_vector"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","search_vector","tsts_db","public","knowledge_items"]);
        await queryRunner.query(`ALTER TABLE "reports" RENAME COLUMN "search_vector" TO "TEMP_OLD_search_vector"`);
        await queryRunner.query(`ALTER TABLE "reports" ADD "search_vector" tsvector`);
        await queryRunner.query(`UPDATE "reports" SET "search_vector" = "TEMP_OLD_search_vector"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "TEMP_OLD_search_vector"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","search_vector","tsts_db","public","reports"]);
        await queryRunner.query(`CREATE INDEX "IDX_8d7b9a157280caf57aa0282e72" ON "tickets" ("ticket_number") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_8d7b9a157280caf57aa0282e72"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP COLUMN "search_vector"`);
        await queryRunner.query(`ALTER TABLE "reports" ADD "search_vector" tsvector`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["tsts_db","public","reports","GENERATED_COLUMN","search_vector",""]);
        await queryRunner.query(`ALTER TABLE "knowledge_items" DROP COLUMN "search_vector"`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" ADD "search_vector" tsvector`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["tsts_db","public","knowledge_items","GENERATED_COLUMN","search_vector",""]);
        await queryRunner.query(`ALTER TABLE "tickets" DROP CONSTRAINT "UQ_8d7b9a157280caf57aa0282e72c"`);
        await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN "ticket_number"`);
        await queryRunner.query(`CREATE INDEX "reports_handler_idx" ON "reports" ("handler") `);
        await queryRunner.query(`CREATE INDEX "reports_search_vector_idx" ON "reports" ("search_vector") `);
        await queryRunner.query(`CREATE INDEX "knowledge_items_search_idx" ON "knowledge_items" ("search_vector") `);
    }

}
