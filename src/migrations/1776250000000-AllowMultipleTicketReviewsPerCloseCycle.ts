import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowMultipleTicketReviewsPerCloseCycle1776250000000
  implements MigrationInterface
{
  name = "AllowMultipleTicketReviewsPerCloseCycle1776250000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_14d8c643bc84d86143401d33f5"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_14d8c643bc84d86143401d33f5" ON "ticket_reviews" ("ticketId", "closeCycle") `,
    );
  }
}
