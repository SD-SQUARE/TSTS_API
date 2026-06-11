import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandPermissionKeyLength1778500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ALTER COLUMN "key" TYPE varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "permissions"
      ALTER COLUMN "key" TYPE varchar(20)
    `);
  }
}
