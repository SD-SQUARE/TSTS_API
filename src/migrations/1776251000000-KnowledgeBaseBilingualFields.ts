import { MigrationInterface, QueryRunner } from "typeorm";

export class KnowledgeBaseBilingualFields1776251000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE knowledge_items
      ADD COLUMN IF NOT EXISTS title_en character varying(255),
      ADD COLUMN IF NOT EXISTS title_ar character varying(255),
      ADD COLUMN IF NOT EXISTS description_en character varying(1000),
      ADD COLUMN IF NOT EXISTS description_ar character varying(1000),
      ADD COLUMN IF NOT EXISTS specialization_en character varying(100),
      ADD COLUMN IF NOT EXISTS specialization_ar character varying(100),
      ADD COLUMN IF NOT EXISTS content_en character varying(200000),
      ADD COLUMN IF NOT EXISTS content_ar character varying(200000)
    `);

    await queryRunner.query(`
      UPDATE knowledge_items
      SET
        title_en = COALESCE(title_en, title),
        title_ar = COALESCE(title_ar, title),
        description_en = COALESCE(description_en, description),
        description_ar = COALESCE(description_ar, description),
        specialization_en = COALESCE(specialization_en, specialization),
        specialization_ar = COALESCE(specialization_ar, specialization),
        content_en = COALESCE(content_en, content),
        content_ar = COALESCE(content_ar, content)
    `);

    await queryRunner.query(`
      ALTER TABLE knowledge_items
      ALTER COLUMN title_en SET NOT NULL,
      ALTER COLUMN title_ar SET NOT NULL,
      ALTER COLUMN description_en SET NOT NULL,
      ALTER COLUMN description_ar SET NOT NULL,
      ALTER COLUMN specialization_en SET NOT NULL,
      ALTER COLUMN specialization_ar SET NOT NULL
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS search_vector_update ON knowledge_items
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS knowledge_items_search_idx
    `);
    await queryRunner.query(`
      ALTER TABLE knowledge_items DROP COLUMN IF EXISTS search_vector
    `);

    await queryRunner.query(`
      ALTER TABLE knowledge_items
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title_en, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(title_ar, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(description_en, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(description_ar, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(specialization_en, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(specialization_ar, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(content_en, '')), 'D') ||
        setweight(to_tsvector('simple', coalesce(content_ar, '')), 'D')
      ) STORED
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS knowledge_items_search_idx
      ON knowledge_items USING GIN (search_vector)
    `);

    await queryRunner.query(`
      ALTER TABLE knowledge_items
      DROP COLUMN IF EXISTS title,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS specialization,
      DROP COLUMN IF EXISTS content
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS knowledge_items_search_idx
    `);
    await queryRunner.query(`
      ALTER TABLE knowledge_items DROP COLUMN IF EXISTS search_vector
    `);
    await queryRunner.query(`
      ALTER TABLE knowledge_items
      ADD COLUMN IF NOT EXISTS title character varying(255),
      ADD COLUMN IF NOT EXISTS description character varying(1000),
      ADD COLUMN IF NOT EXISTS specialization character varying(100),
      ADD COLUMN IF NOT EXISTS content character varying(200000)
    `);

    await queryRunner.query(`
      UPDATE knowledge_items
      SET
        title = COALESCE(title, title_en),
        description = COALESCE(description, description_en),
        specialization = COALESCE(specialization, specialization_en),
        content = COALESCE(content, content_en)
    `);

    await queryRunner.query(`
      ALTER TABLE knowledge_items
      ALTER COLUMN title SET NOT NULL,
      ALTER COLUMN description SET NOT NULL,
      ALTER COLUMN specialization SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE knowledge_items
      ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(specialization, '')), 'C')
      ) STORED
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS knowledge_items_search_idx
      ON knowledge_items USING GIN (search_vector)
    `);

    await queryRunner.query(`
      ALTER TABLE knowledge_items
      DROP COLUMN IF EXISTS title_en,
      DROP COLUMN IF EXISTS title_ar,
      DROP COLUMN IF EXISTS description_en,
      DROP COLUMN IF EXISTS description_ar,
      DROP COLUMN IF EXISTS specialization_en,
      DROP COLUMN IF EXISTS specialization_ar,
      DROP COLUMN IF EXISTS content_en,
      DROP COLUMN IF EXISTS content_ar
    `);
  }
}
