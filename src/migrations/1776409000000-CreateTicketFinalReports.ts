import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTicketFinalReports1776409000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ticket_final_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "ticketId" uuid NOT NULL,
        "authorId" uuid NOT NULL,
        "title_en" character varying(255),
        "title_ar" character varying(255),
        "content_en" text,
        "content_ar" text,
        "knowledgeDraft" jsonb,
        "publishedKnowledgeItemId" uuid,
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_ticket_final_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_final_reports_ticket" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_ticket_final_reports_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ticket_final_reports_ticket_unique"
      ON "ticket_final_reports" ("ticketId")
    `);

    await queryRunner.query(`
      CREATE TABLE "ticket_final_report_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "reportId" uuid NOT NULL,
        "actorId" uuid,
        "action" character varying(50) NOT NULL,
        "payload" jsonb,
        CONSTRAINT "PK_ticket_final_report_history_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_final_report_history_report" FOREIGN KEY ("reportId") REFERENCES "ticket_final_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_ticket_final_report_history_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ticket_final_report_history_report"
      ON "ticket_final_report_history" ("reportId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ticket_final_report_history_actor"
      ON "ticket_final_report_history" ("actorId")
    `);

    await queryRunner.query(`
      ALTER TABLE "media"
      ADD COLUMN "finalReportId" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "media"
      ADD CONSTRAINT "FK_media_final_report"
      FOREIGN KEY ("finalReportId") REFERENCES "ticket_final_reports"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_media_final_report"
      ON "media" ("finalReportId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_media_final_report"
    `);

    await queryRunner.query(`
      ALTER TABLE "media"
      DROP CONSTRAINT IF EXISTS "FK_media_final_report"
    `);

    await queryRunner.query(`
      ALTER TABLE "media"
      DROP COLUMN IF EXISTS "finalReportId"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ticket_final_report_history_actor"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ticket_final_report_history_report"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "ticket_final_report_history"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ticket_final_reports_ticket_unique"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "ticket_final_reports"
    `);
  }
}
