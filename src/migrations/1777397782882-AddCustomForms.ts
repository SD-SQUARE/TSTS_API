import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomForms1777397782882 implements MigrationInterface {
    name = 'AddCustomForms1777397782882'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "media" DROP CONSTRAINT "FK_media_final_report"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" DROP CONSTRAINT "FK_chat_message_reads_user"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" DROP CONSTRAINT "FK_chat_message_reads_message"`);
        await queryRunner.query(`ALTER TABLE "ticket_quick_messages" DROP CONSTRAINT "FK_ticket_quick_messages_user"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" DROP CONSTRAINT "FK_ticket_final_reports_author"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" DROP CONSTRAINT "FK_ticket_final_reports_ticket"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" DROP CONSTRAINT "FK_ticket_final_report_history_actor"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" DROP CONSTRAINT "FK_ticket_final_report_history_report"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_media_final_report"`);
        await queryRunner.query(`DROP INDEX "public"."knowledge_items_search_idx"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chat_message_reads_message"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_chat_message_reads_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_quick_messages_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_final_report_history_report"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ticket_final_report_history_actor"`);
        await queryRunner.query(`CREATE TABLE "form_responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "data" jsonb NOT NULL, "formId" uuid NOT NULL, "responderId" uuid, "ticketId" uuid, CONSTRAINT "PK_36a512e5574d0a366b40b26874e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "custom_forms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "title" character varying(255) NOT NULL, "description" text, "fields" jsonb NOT NULL DEFAULT '[]', "isGlobal" boolean NOT NULL DEFAULT false, "token" character varying(100) NOT NULL, "ticketId" uuid, "creatorId" uuid NOT NULL, CONSTRAINT "UQ_8fb9ba508d11f5e55626c6a8df4" UNIQUE ("token"), CONSTRAINT "PK_0215692927c0c9311099d40bdd0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8fb9ba508d11f5e55626c6a8df" ON "custom_forms" ("token") `);
        await queryRunner.query(`ALTER TABLE "knowledge_items" RENAME COLUMN "search_vector" TO "TEMP_OLD_search_vector"`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" ADD "search_vector" tsvector`);
        await queryRunner.query(`UPDATE "knowledge_items" SET "search_vector" = "TEMP_OLD_search_vector"`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" DROP COLUMN "TEMP_OLD_search_vector"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = $3 AND "schema" = $4 AND "table" = $5`, ["GENERATED_COLUMN","search_vector","tsts_db","public","knowledge_items"]);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" DROP CONSTRAINT "UQ_chat_message_reads_message_user"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ALTER COLUMN "messageId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_d8d5e103efdcf0e004c02b29c2" ON "knowledge_items" ("specialization_en") `);
        await queryRunner.query(`CREATE INDEX "IDX_0500fd2babca961d7e464ce9a0" ON "ticket_quick_messages" ("userId") `);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ADD CONSTRAINT "UQ_chat_message_reads_message_user" UNIQUE ("messageId", "userId")`);
        await queryRunner.query(`ALTER TABLE "media" ADD CONSTRAINT "FK_e307f0f6985bb451c82a9d75f59" FOREIGN KEY ("finalReportId") REFERENCES "ticket_final_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ADD CONSTRAINT "FK_150e1da0f3971d1ce87d13e1515" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ADD CONSTRAINT "FK_48e8707ab0f445b2642556ae6c8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_quick_messages" ADD CONSTRAINT "FK_0500fd2babca961d7e464ce9a05" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" ADD CONSTRAINT "FK_7012d62e3b65b718d20ae6b4a02" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" ADD CONSTRAINT "FK_2fb939c722e00c59bf834309153" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" ADD CONSTRAINT "FK_5bd7569a1c062951503c5a06ee3" FOREIGN KEY ("reportId") REFERENCES "ticket_final_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" ADD CONSTRAINT "FK_2d1535a730271e81b69d73a6cf8" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_responses" ADD CONSTRAINT "FK_8e9a32f15bd2485ea908787b634" FOREIGN KEY ("formId") REFERENCES "custom_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_responses" ADD CONSTRAINT "FK_56e59f7f3a25926bb3406d9f1a0" FOREIGN KEY ("responderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "form_responses" ADD CONSTRAINT "FK_e763ec70b574e0dbbffe8551bc2" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_forms" ADD CONSTRAINT "FK_8d6b6dc0aa2c01d68dc0e001445" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_forms" ADD CONSTRAINT "FK_5f30906e14a18fbd242e20085b5" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_forms" DROP CONSTRAINT "FK_5f30906e14a18fbd242e20085b5"`);
        await queryRunner.query(`ALTER TABLE "custom_forms" DROP CONSTRAINT "FK_8d6b6dc0aa2c01d68dc0e001445"`);
        await queryRunner.query(`ALTER TABLE "form_responses" DROP CONSTRAINT "FK_e763ec70b574e0dbbffe8551bc2"`);
        await queryRunner.query(`ALTER TABLE "form_responses" DROP CONSTRAINT "FK_56e59f7f3a25926bb3406d9f1a0"`);
        await queryRunner.query(`ALTER TABLE "form_responses" DROP CONSTRAINT "FK_8e9a32f15bd2485ea908787b634"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" DROP CONSTRAINT "FK_2d1535a730271e81b69d73a6cf8"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" DROP CONSTRAINT "FK_5bd7569a1c062951503c5a06ee3"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" DROP CONSTRAINT "FK_2fb939c722e00c59bf834309153"`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" DROP CONSTRAINT "FK_7012d62e3b65b718d20ae6b4a02"`);
        await queryRunner.query(`ALTER TABLE "ticket_quick_messages" DROP CONSTRAINT "FK_0500fd2babca961d7e464ce9a05"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" DROP CONSTRAINT "FK_48e8707ab0f445b2642556ae6c8"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" DROP CONSTRAINT "FK_150e1da0f3971d1ce87d13e1515"`);
        await queryRunner.query(`ALTER TABLE "media" DROP CONSTRAINT "FK_e307f0f6985bb451c82a9d75f59"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" DROP CONSTRAINT "UQ_chat_message_reads_message_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0500fd2babca961d7e464ce9a0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d8d5e103efdcf0e004c02b29c2"`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ALTER COLUMN "userId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ALTER COLUMN "messageId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ADD CONSTRAINT "UQ_chat_message_reads_message_user" UNIQUE ("messageId", "userId")`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" DROP COLUMN "search_vector"`);
        await queryRunner.query(`ALTER TABLE "knowledge_items" ADD "search_vector" tsvector`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES ($1, $2, $3, $4, $5, $6)`, ["tsts_db","public","knowledge_items","GENERATED_COLUMN","search_vector",""]);
        await queryRunner.query(`DROP INDEX "public"."IDX_8fb9ba508d11f5e55626c6a8df"`);
        await queryRunner.query(`DROP TABLE "custom_forms"`);
        await queryRunner.query(`DROP TABLE "form_responses"`);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_final_report_history_actor" ON "ticket_final_report_history" ("actorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_final_report_history_report" ON "ticket_final_report_history" ("reportId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ticket_quick_messages_user" ON "ticket_quick_messages" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_chat_message_reads_user" ON "chat_message_reads" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_chat_message_reads_message" ON "chat_message_reads" ("messageId") `);
        await queryRunner.query(`CREATE INDEX "knowledge_items_search_idx" ON "knowledge_items" ("search_vector") `);
        await queryRunner.query(`CREATE INDEX "IDX_media_final_report" ON "media" ("finalReportId") `);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" ADD CONSTRAINT "FK_ticket_final_report_history_report" FOREIGN KEY ("reportId") REFERENCES "ticket_final_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_final_report_history" ADD CONSTRAINT "FK_ticket_final_report_history_actor" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" ADD CONSTRAINT "FK_ticket_final_reports_ticket" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_final_reports" ADD CONSTRAINT "FK_ticket_final_reports_author" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket_quick_messages" ADD CONSTRAINT "FK_ticket_quick_messages_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ADD CONSTRAINT "FK_chat_message_reads_message" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_message_reads" ADD CONSTRAINT "FK_chat_message_reads_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "media" ADD CONSTRAINT "FK_media_final_report" FOREIGN KEY ("finalReportId") REFERENCES "ticket_final_reports"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
