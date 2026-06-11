import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatMessageReads1776411000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_message_reads" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "messageId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        CONSTRAINT "PK_chat_message_reads_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_chat_message_reads_message"
          FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_chat_message_reads_user"
          FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "UQ_chat_message_reads_message_user"
          UNIQUE ("messageId", "userId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_message_reads_message"
      ON "chat_message_reads" ("messageId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_chat_message_reads_user"
      ON "chat_message_reads" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_chat_message_reads_user"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_chat_message_reads_message"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "chat_message_reads"
    `);
  }
}
