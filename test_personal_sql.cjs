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
    WITH last_messages AS (
      SELECT DISTINCT ON (
        LEAST(m."senderId", m."recipientId"),
        GREATEST(m."senderId", m."recipientId")
      )
        m.id,
        m.content,
        m."createdAt",
        m."senderId",
        m."recipientId",
        CASE 
          WHEN m."senderId" = $1 THEN u.id
          ELSE s.id
        END as "otherUserId",
        CASE
          WHEN m."senderId" = $1 THEN u.email
          ELSE s.email
        END as "otherUserEmail",
        CASE
          WHEN m."senderId" = $1 THEN u.image
          ELSE s.image
        END as "otherUserImage",
        CASE 
          WHEN m."senderId" = $1 THEN COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ',
              NULLIF(COALESCE(u."firstName"->>'en', ''), ''),
              NULLIF(COALESCE(u."midName"->>'en', ''), ''),
              NULLIF(COALESCE(u."lastName"->>'en', ''), '')
            )), ''),
            u.email
          )
          ELSE COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ',
              NULLIF(COALESCE(s."firstName"->>'en', ''), ''),
              NULLIF(COALESCE(s."midName"->>'en', ''), ''),
              NULLIF(COALESCE(s."lastName"->>'en', ''), '')
            )), ''),
            s.email
          )
        END as "otherUserNameEn",
        CASE 
          WHEN m."senderId" = $1 THEN COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ',
              NULLIF(COALESCE(u."firstName"->>'ar', ''), ''),
              NULLIF(COALESCE(u."midName"->>'ar', ''), ''),
              NULLIF(COALESCE(u."lastName"->>'ar', ''), '')
            )), ''),
            u.email
          )
          ELSE COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ',
              NULLIF(COALESCE(s."firstName"->>'ar', ''), ''),
              NULLIF(COALESCE(s."midName"->>'ar', ''), ''),
              NULLIF(COALESCE(s."lastName"->>'ar', ''), '')
            )), ''),
            s.email
          )
        END as "otherUserNameAr"
      FROM chat_messages m
      LEFT JOIN "users" s ON m."senderId" = s.id
      LEFT JOIN "users" u ON m."recipientId" = u.id
      WHERE m."senderId" = $1 OR m."recipientId" = $1
      ORDER BY
        LEAST(m."senderId", m."recipientId"),
        GREATEST(m."senderId", m."recipientId"),
        m."createdAt" DESC
    ),
    unread_counts AS (
      SELECT
        m."senderId" AS "otherUserId",
        COUNT(m.id)::int AS "unreadCount"
      FROM chat_messages m
      WHERE m."recipientId" = $1
        AND m."isRead" = false
      GROUP BY m."senderId"
    )
    SELECT 
      lm.*,
      COALESCE(uc."unreadCount", 0) AS "unreadCount"
    FROM last_messages lm
    LEFT JOIN unread_counts uc ON uc."otherUserId" = lm."otherUserId"
  `;
  
  try {
    const res = await c.query(query, ['2d8fa0d0-a06f-4697-b3da-ab8555cc9c19']);
    console.log(res.rows.map(r => r['QUERY PLAN']).join('\n'));
  } catch (e) {
    console.error(e);
  } finally {
    await c.end();
  }
}

main();
