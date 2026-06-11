const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'mydb'
});
ds.initialize().then(async () => {
  const result = await ds.query(`
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
    WHERE tl."userId" = '90b76d36-2b83-4f32-a86d-b2524ef8dc35' AND tl."deletedAt" IS NULL
  `);
  console.log(result.map(r => r['QUERY PLAN']).join('\n'));
  process.exit(0);
}).catch(console.error);
