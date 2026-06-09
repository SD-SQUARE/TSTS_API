import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds AI Assistant configuration columns to the site_settings table.
 *
 * New columns:
 *   - aiAssistantEnabled  BOOLEAN  DEFAULT true   — master on/off switch
 *   - aiModelName         VARCHAR(255) NULLABLE   — model name (e.g. llama3.2, gpt-4o-mini)
 *   - aiApiKey            VARCHAR(500) NULLABLE   — API key for remote providers (stored encrypted at rest by DB)
 *   - aiChatUrl           VARCHAR(500) NULLABLE   — base URL of the AI service
 */
export class AddAiAssistantSettings1778700000000 implements MigrationInterface {
    name = "AddAiAssistantSettings1778700000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "site_settings"
            ADD COLUMN IF NOT EXISTS "aiAssistantEnabled" boolean NOT NULL DEFAULT true,
            ADD COLUMN IF NOT EXISTS "aiModelName"        varchar(255),
            ADD COLUMN IF NOT EXISTS "aiApiKey"           varchar(500),
            ADD COLUMN IF NOT EXISTS "aiChatUrl"          varchar(500)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "site_settings"
            DROP COLUMN IF EXISTS "aiAssistantEnabled",
            DROP COLUMN IF EXISTS "aiModelName",
            DROP COLUMN IF EXISTS "aiApiKey",
            DROP COLUMN IF EXISTS "aiChatUrl"
        `);
    }
}
