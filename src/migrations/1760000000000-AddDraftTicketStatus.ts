import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDraftTicketStatus1760000000000 implements MigrationInterface {
  name = "AddDraftTicketStatus1760000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."tickets_status_enum" ADD VALUE IF NOT EXISTS 'draft' BEFORE 'open'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL cannot safely remove an enum value while rows may still use it.
  }
}
