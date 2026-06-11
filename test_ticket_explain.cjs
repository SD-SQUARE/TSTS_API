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
  
  // Note: Since this query uses ANY($1), we will simulate it by joining 50 tickets
  const query = `
    EXPLAIN ANALYZE 
    SELECT
        t.id,
        t.ticket_number,
        t.title,
        t.description,
        t.status,
        t.priority,
        t."isOutOfService",
        t."createdAt",
        t."modifiedAt",
        req.id                        AS requester_id,
        req."firstName"->>'en'        AS requester_firstName_en,
        req."firstName"->>'ar'        AS requester_firstName_ar,
        req."midName"->>'en'          AS requester_midName_en,
        req."midName"->>'ar'          AS requester_midName_ar,
        req."lastName"->>'en'         AS requester_lastName_en,
        req."lastName"->>'ar'         AS requester_lastName_ar,
        req.image                     AS requester_image,
        req."rustdeskId"              AS requester_rustdeskId,
        uni.id                        AS university_id,
        uni.name                      AS university_name,
        dom.id                        AS domain_id,
        dom.name                      AS domain_name,
        spec.id                       AS specialization_id,
        spec.name                     AS specialization_name,
        prob.id                       AS problem_id,
        prob.name                     AS problem_name,
        (
            SELECT json_agg(json_build_object(
                'id', u.id,
                'firstName_en', u."firstName"->>'en',
                'firstName_ar', u."firstName"->>'ar',
                'midName_en',   u."midName"->>'en',
                'midName_ar',   u."midName"->>'ar',
                'lastName_en',  u."lastName"->>'en',
                'lastName_ar',  u."lastName"->>'ar',
                'image', u.image
            ))
            FROM ticket_assignees ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.ticket_id = t.id
        )                             AS assignees_json
    FROM tickets t
    LEFT JOIN users          req  ON req.id   = t."requesterId"
    LEFT JOIN universities   uni  ON uni.id   = req."universityId"
    LEFT JOIN domains        dom  ON dom.id   = req."domainId"
    LEFT JOIN specializations spec ON spec.id = t."specializationId"
    LEFT JOIN problems       prob ON prob.id  = t."problemId"
    WHERE t.id IN (SELECT id FROM tickets ORDER BY "createdAt" DESC LIMIT 50)
    ORDER BY t."createdAt" DESC
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
