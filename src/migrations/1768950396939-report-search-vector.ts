import { MigrationInterface, QueryRunner } from "typeorm";

export class ReportSearchVector1768950396939 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create typeorm_metadata table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS typeorm_metadata (
        type varchar(255) NOT NULL,
        database varchar(255),
        schema varchar(255),
        "table" varchar(255),
        name varchar(255),
        value text
      );
    `);

    // Check if reports table exists
    const tableExists = await queryRunner.hasTable("reports");
    if (!tableExists) {
      console.log("[Migration] Reports table does not exist yet, skipping migration");
      return;
    }

    // Drop existing trigger if exists
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS report_search_vector_update ON reports;
    `);

    // Check if column exists and drop it
    const hasColumn = await queryRunner.hasColumn("reports", "search_vector");
    if (hasColumn) {
      await queryRunner.query(`
        ALTER TABLE reports DROP COLUMN search_vector
      `);
    }

    // 1️⃣ Add generated column for JSONB fields
    await queryRunner.query(`
      ALTER TABLE reports
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title->>'en', '')), 'A') ||
        setweight(to_tsvector('arabic', coalesce(title->>'ar', '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description->>'en', '')), 'B') ||
        setweight(to_tsvector('arabic', coalesce(description->>'ar', '')), 'B')
      ) STORED;
    `);

    // 2️⃣ Add GIN index for fast full-text search
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS reports_search_vector_idx
      ON reports USING GIN (search_vector);
    `);

    // 3️⃣ Add index on handler column if not exists
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS reports_handler_idx
      ON reports (handler);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists
    const tableExists = await queryRunner.hasTable("reports");
    if (!tableExists) {
      return;
    }

    // Remove trigger first (if exists)
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS report_search_vector_update ON reports`
    );

    // Remove indexes
    await queryRunner.query(`DROP INDEX IF EXISTS reports_search_vector_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS reports_handler_idx`);

    // Drop generated column if exists
    const hasColumn = await queryRunner.hasColumn("reports", "search_vector");
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE reports DROP COLUMN search_vector`
      );
    }
  }
}
