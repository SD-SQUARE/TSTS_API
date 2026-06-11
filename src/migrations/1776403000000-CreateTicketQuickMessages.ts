import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTicketQuickMessages1776403000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ticket_quick_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "title" character varying(120) NOT NULL,
        "content" text NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_ticket_quick_messages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ticket_quick_messages_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ticket_quick_messages_user" ON "ticket_quick_messages" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_ticket_quick_messages_user"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "ticket_quick_messages"
    `);
  }
}
