import { MigrationInterface, QueryRunner } from "typeorm";

export class SearchVectorTrigger1768950396938 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
    DROP TRIGGER IF EXISTS search_vector_update ON knowledge_items;
    `);

    await queryRunner.query(
    `ALTER TABLE knowledge_items DROP COLUMN IF EXISTS search_vector`
    );
    // 1️⃣ Add generated column
    await queryRunner.query(`
      ALTER TABLE knowledge_items
      ADD COLUMN  search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(specialization, '')), 'C')
      ) STORED;
    `);

    // 2️⃣ Add GIN index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS knowledge_items_search_idx
      ON knowledge_items USING GIN (search_vector);
    `);

    // 3️⃣ Create trigger for live updates
    await queryRunner.query(`
      CREATE TRIGGER  search_vector_update
      BEFORE INSERT OR UPDATE ON knowledge_items
      FOR EACH ROW EXECUTE PROCEDURE
        tsvector_update_trigger(
          search_vector, 'pg_catalog.english',
          title, description, specialization, content
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove trigger first
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS search_vector_update ON knowledge_items`
    );

    // Remove index
    await queryRunner.query(`DROP INDEX IF EXISTS knowledge_items_search_idx`);

    // Drop generated column
    await queryRunner.query(
      `ALTER TABLE knowledge_items DROP COLUMN IF EXISTS search_vector`
    );
  }
}
