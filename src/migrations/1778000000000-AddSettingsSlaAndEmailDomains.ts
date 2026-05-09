import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsSlaAndEmailDomains1778000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "site_settings" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL,
        "logoPath" varchar(500) NULL,
        "unassignedTicketAlertMinutes" integer NOT NULL DEFAULT 60
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "allowed_email_domains" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL,
        "domain" varchar(255) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ALLOWED_EMAIL_DOMAIN_DOMAIN"
      ON "allowed_email_domains" ("domain")
      WHERE "deletedAt" IS NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sla_rules" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz NULL,
        "name" jsonb NOT NULL,
        "maxHours" integer NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "universityId" uuid NULL,
        "domainId" uuid NULL,
        "specializationId" uuid NULL,
        "problemId" uuid NULL
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sla_rules_university') THEN
          ALTER TABLE "sla_rules"
          ADD CONSTRAINT "FK_sla_rules_university"
          FOREIGN KEY ("universityId") REFERENCES "universities"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sla_rules_domain') THEN
          ALTER TABLE "sla_rules"
          ADD CONSTRAINT "FK_sla_rules_domain"
          FOREIGN KEY ("domainId") REFERENCES "domains"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sla_rules_specialization') THEN
          ALTER TABLE "sla_rules"
          ADD CONSTRAINT "FK_sla_rules_specialization"
          FOREIGN KEY ("specializationId") REFERENCES "specializations"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_sla_rules_problem') THEN
          ALTER TABLE "sla_rules"
          ADD CONSTRAINT "FK_sla_rules_problem"
          FOREIGN KEY ("problemId") REFERENCES "problems"("id")
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "tickets"
      ADD COLUMN IF NOT EXISTS "unassignedAlertedAt" timestamptz NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tickets"
      DROP COLUMN IF EXISTS "unassignedAlertedAt"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "sla_rules"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ALLOWED_EMAIL_DOMAIN_DOMAIN"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "allowed_email_domains"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "site_settings"`);
  }
}
