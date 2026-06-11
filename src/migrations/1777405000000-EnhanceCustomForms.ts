import { MigrationInterface, QueryRunner } from "typeorm";

export class EnhanceCustomForms1777405000000 implements MigrationInterface {
  name = "EnhanceCustomForms1777405000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_forms" ADD COLUMN IF NOT EXISTS "settings" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_forms" DROP COLUMN IF EXISTS "settings"`,
    );
  }
}
