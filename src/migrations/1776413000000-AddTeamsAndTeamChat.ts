import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTeamsAndTeamChat1776413000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "teams" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" jsonb,
        "groupId" uuid NOT NULL,
        CONSTRAINT "PK_teams_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_teams_group"
          FOREIGN KEY ("groupId") REFERENCES "groups"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_teams_group"
      ON "teams" ("groupId")
    `);

    await queryRunner.query(`
      CREATE TABLE "team_leads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "userId" uuid,
        "teamId" uuid,
        CONSTRAINT "PK_team_leads_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_leads_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_team_leads_team"
          FOREIGN KEY ("teamId") REFERENCES "teams"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_team_leads_user_team"
          UNIQUE ("userId", "teamId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_team_leads_team"
      ON "team_leads" ("teamId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_team_leads_user"
      ON "team_leads" ("userId")
    `);

    await queryRunner.query(`
      CREATE TABLE "team_technicians" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "userId" uuid,
        "teamId" uuid,
        CONSTRAINT "PK_team_technicians_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_team_technicians_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_team_technicians_team"
          FOREIGN KEY ("teamId") REFERENCES "teams"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_team_technicians_user_team"
          UNIQUE ("userId", "teamId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_team_technicians_team"
      ON "team_technicians" ("teamId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_team_technicians_user"
      ON "team_technicians" ("userId")
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD COLUMN IF NOT EXISTS "teamId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      ADD CONSTRAINT "FK_chat_messages_team"
        FOREIGN KEY ("teamId") REFERENCES "teams"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_messages_team"
      ON "chat_messages" ("teamId")
    `);

    await queryRunner.query(`
      INSERT INTO "teams" ("name", "groupId")
      SELECT
        jsonb_build_object(
          'en',
          CASE
            WHEN COALESCE(g."name"->>'en', '') = '' THEN 'General Team'
            ELSE CONCAT(g."name"->>'en', ' Team')
          END,
          'ar',
          CASE
            WHEN COALESCE(g."name"->>'ar', '') = '' THEN 'الفريق العام'
            ELSE CONCAT(g."name"->>'ar', ' فريق')
          END
        ),
        g."id"
      FROM "groups" g
      WHERE g."teamLeaderId" IS NOT NULL
         OR EXISTS (
           SELECT 1
           FROM "technician_groups" tg
           WHERE tg."groupId" = g."id"
         )
    `);

    await queryRunner.query(`
      INSERT INTO "team_leads" ("userId", "teamId")
      SELECT DISTINCT
        g."teamLeaderId",
        t."id"
      FROM "groups" g
      INNER JOIN "teams" t ON t."groupId" = g."id"
      WHERE g."teamLeaderId" IS NOT NULL
      ON CONFLICT ("userId", "teamId") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "team_technicians" ("userId", "teamId")
      SELECT DISTINCT
        tg."userId",
        t."id"
      FROM "technician_groups" tg
      INNER JOIN "teams" t ON t."groupId" = tg."groupId"
      ON CONFLICT ("userId", "teamId") DO NOTHING
    `);

    await queryRunner.query(`
      ALTER TABLE "groups"
      DROP CONSTRAINT IF EXISTS "FK_f4ede9c44e42cf9dc6c90d7430a"
    `);

    await queryRunner.query(`
      ALTER TABLE "groups"
      DROP COLUMN IF EXISTS "teamLeaderId"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "groups"
      ADD COLUMN IF NOT EXISTS "teamLeaderId" uuid
    `);

    await queryRunner.query(`
      UPDATE "groups" g
      SET "teamLeaderId" = source."userId"
      FROM (
        SELECT DISTINCT ON (t."groupId")
          t."groupId",
          tl."userId"
        FROM "team_leads" tl
        INNER JOIN "teams" t ON t."id" = tl."teamId"
        ORDER BY t."groupId", tl."createdAt" ASC
      ) AS source
      WHERE g."id" = source."groupId"
    `);

    await queryRunner.query(`
      ALTER TABLE "groups"
      ADD CONSTRAINT "FK_f4ede9c44e42cf9dc6c90d7430a"
        FOREIGN KEY ("teamLeaderId") REFERENCES "users"("id")
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_chat_messages_team"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      DROP CONSTRAINT IF EXISTS "FK_chat_messages_team"
    `);

    await queryRunner.query(`
      ALTER TABLE "chat_messages"
      DROP COLUMN IF EXISTS "teamId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_team_technicians_user"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_team_technicians_team"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "team_technicians"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_team_leads_user"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_team_leads_team"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "team_leads"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_teams_group"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "teams"
    `);
  }
}
