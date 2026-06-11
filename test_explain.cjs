const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    database: 'tsts_db',
    user: 'postgres',
    password: 'postgres'
  });
  
  await c.connect();
  
  const query = `
    EXPLAIN ANALYZE 
    SELECT DISTINCT gs."specializationId" 
    FROM group_heads gh 
    INNER JOIN group_specializations gs ON gs."groupId" = gh."groupId" AND gs."deletedAt" IS NULL 
    WHERE gh."userId" = '90b76d36-2b83-4f32-a86d-b2524ef8dc35' AND gh."deletedAt" IS NULL 
    UNION 
    SELECT DISTINCT gs."specializationId" 
    FROM team_leads tl 
    INNER JOIN teams t ON t.id = tl."teamId" AND t."deletedAt" IS NULL 
    INNER JOIN group_specializations gs ON gs."groupId" = t."groupId" AND gs."deletedAt" IS NULL 
    WHERE tl."userId" = '90b76d36-2b83-4f32-a86d-b2524ef8dc35' AND tl."deletedAt" IS NULL;
  `;
  
  try {
    const res = await c.query(query);
    console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));
  } catch (e) {
    console.error(e);
  } finally {
    await c.end();
  }
}

main();
