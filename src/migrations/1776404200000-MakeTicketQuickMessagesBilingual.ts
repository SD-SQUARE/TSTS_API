import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeTicketQuickMessagesBilingual1776404200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ticket_quick_messages"
      ADD COLUMN "title_en" character varying(120),
      ADD COLUMN "title_ar" character varying(120),
      ADD COLUMN "content_en" text,
      ADD COLUMN "content_ar" text
    `);

    await queryRunner.query(`
      UPDATE "ticket_quick_messages"
      SET
        "title_en" = COALESCE(NULLIF(TRIM("title"), ''), LEFT("content", 120)),
        "title_ar" = COALESCE(NULLIF(TRIM("title"), ''), LEFT("content", 120)),
        "content_en" = "content",
        "content_ar" = "content"
    `);

    await queryRunner.query(`
      ALTER TABLE "ticket_quick_messages"
      ALTER COLUMN "title_en" SET NOT NULL,
      ALTER COLUMN "title_ar" SET NOT NULL,
      ALTER COLUMN "content_en" SET NOT NULL,
      ALTER COLUMN "content_ar" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "ticket_quick_messages"
      DROP COLUMN "title",
      DROP COLUMN "content"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ticket_quick_messages"
      ADD COLUMN "title" character varying(120),
      ADD COLUMN "content" text
    `);

    await queryRunner.query(`
      UPDATE "ticket_quick_messages"
      SET
        "title" = COALESCE(NULLIF(TRIM("title_en"), ''), LEFT("content_en", 120)),
        "content" = COALESCE("content_en", "content_ar")
    `);

    await queryRunner.query(`
      ALTER TABLE "ticket_quick_messages"
      ALTER COLUMN "title" SET NOT NULL,
      ALTER COLUMN "content" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "ticket_quick_messages"
      DROP COLUMN "title_en",
      DROP COLUMN "title_ar",
      DROP COLUMN "content_en",
      DROP COLUMN "content_ar"
    `);
  }
}
