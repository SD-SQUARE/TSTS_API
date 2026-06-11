import { PostgresDataSource } from './src/database/postgres-data-source.js';

async function main() {
  await PostgresDataSource.initialize();

  const userId = '90b76d36-2b83-4f32-a86d-b2524ef8dc35';
  
  const query = `
    WITH user_groups AS (
      SELECT "groupId" FROM group_heads WHERE "userId" = $1 AND "deletedAt" IS NULL
      UNION
      SELECT "groupId" FROM technician_groups WHERE "userId" = $1 AND "deletedAt" IS NULL
      UNION
      SELECT t."groupId" FROM team_leads tl INNER JOIN teams t ON t.id = tl."teamId" WHERE tl."userId" = $1 AND tl."deletedAt" IS NULL AND t."deletedAt" IS NULL
      UNION
      SELECT t."groupId" FROM team_technicians tt INNER JOIN teams t ON t.id = tt."teamId" WHERE tt."userId" = $1 AND tt."deletedAt" IS NULL AND t."deletedAt" IS NULL
    ),
    unread_counts AS (
      SELECT 
        m."groupId",
        COUNT(m.id) as "unreadCount"
      FROM chat_messages m
      LEFT JOIN chat_message_reads r ON r."messageId" = m.id AND r."userId" = $1
      WHERE m."groupId" IN (SELECT "groupId" FROM user_groups)
        AND m."senderId" != $1
        AND r.id IS NULL
      GROUP BY m."groupId"
    )
    SELECT DISTINCT ON (g.id)
      g.id as "groupId",
      g.name->>'en' as "name_en",
      g.name->>'ar' as "name_ar",
      m.content as "lastMessage",
      m."createdAt" as "lastMessageAt",
      COALESCE(uc."unreadCount", 0) as "unreadCount"
    FROM user_groups ug
    INNER JOIN groups g ON g.id = ug."groupId" AND g."deletedAt" IS NULL
    LEFT JOIN chat_messages m ON m."groupId" = g.id
    LEFT JOIN unread_counts uc ON uc."groupId" = g.id
    ORDER BY g.id, m."createdAt" DESC;
  `;

  console.time('SQL');
  const rows = await PostgresDataSource.query(query, [userId]);
  console.timeEnd('SQL');
  console.log(rows);
  
  await PostgresDataSource.destroy();
}

main().catch(console.error);
