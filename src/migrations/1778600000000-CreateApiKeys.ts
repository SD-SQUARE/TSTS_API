import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateApiKeys1778600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL,
        "name" varchar(150) NOT NULL,
        "description" text NULL,
        "keyPrefix" varchar(24) NOT NULL,
        "keyHash" varchar(128) NOT NULL,
        "zones" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "methods" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "isActive" boolean NOT NULL DEFAULT true,
        "expiresAt" timestamptz NULL,
        "lastUsedAt" timestamptz NULL,
        "lastUsedIp" varchar(80) NULL,
        "createdById" uuid NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_API_KEYS_PREFIX"
      ON "api_keys" ("keyPrefix")
      WHERE "deletedAt" IS NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_API_KEYS_HASH"
      ON "api_keys" ("keyHash")
      WHERE "deletedAt" IS NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_api_keys_created_by') THEN
          ALTER TABLE "api_keys"
          ADD CONSTRAINT "FK_api_keys_created_by"
          FOREIGN KEY ("createdById") REFERENCES "users"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "api_keys"
      DROP CONSTRAINT IF EXISTS "FK_api_keys_created_by"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_API_KEYS_HASH"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_API_KEYS_PREFIX"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
  }
}
