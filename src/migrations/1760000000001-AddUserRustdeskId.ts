import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserRustdeskId1760000000001 implements MigrationInterface {
  name = "AddUserRustdeskId1760000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rustdeskId" character varying(64)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_USERS_RUSTDESK_ID" ON "users" ("rustdeskId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_USERS_RUSTDESK_ID"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "rustdeskId"`);
  }
}
