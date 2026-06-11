import { PostgresDataSource } from './src/database/postgres-data-source.js';

async function main() {
  await PostgresDataSource.initialize();

  const userId = '90b76d36-2b83-4f32-a86d-b2524ef8dc35';

  const SPEC_IDS_SQL = `
    SELECT DISTINCT gs."specializationId"
    FROM group_heads gh
    INNER JOIN group_specializations gs
      ON gs."groupId" = gh."groupId"
      AND gs."deletedAt" IS NULL
    WHERE gh."userId" = $1
      AND gh."deletedAt" IS NULL
  
    UNION
  
    SELECT DISTINCT gs."specializationId"
    FROM team_leads tl
    INNER JOIN teams t
      ON t.id = tl."teamId"
      AND t."deletedAt" IS NULL
    INNER JOIN group_specializations gs
      ON gs."groupId" = t."groupId"
      AND gs."deletedAt" IS NULL
    WHERE tl."userId" = $1
      AND tl."deletedAt" IS NULL
  `;

  console.log("=== EXPLAIN ANALYZE ===");
  const explain = await PostgresDataSource.query(`EXPLAIN ANALYZE ${SPEC_IDS_SQL}`, [userId]);
  console.log(explain.map(row => row['QUERY PLAN']).join('\n'));

  console.log("\n=== INDEXES ===");
  const tables = ['group_heads', 'group_specializations', 'team_leads', 'teams'];
  for (const table of tables) {
    const indexes = await PostgresDataSource.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = $1;
    `, [table]);
    console.log(`\nTable: ${table}`);
    if (indexes.length === 0) {
        console.log("No indexes found.");
    }
    indexes.forEach(idx => {
      console.log(`- ${idx.indexname}: ${idx.indexdef}`);
    });
  }

  await PostgresDataSource.destroy();
}

main().catch(console.error);
