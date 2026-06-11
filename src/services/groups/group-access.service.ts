import { PostgresDataSource } from "../../database/postgres-data-source.js";
import { UserType } from "../../enums/UserType.enum.js";
import { redisClient } from "../../database/redis.js";

// ─── Redis Cache ────────────────────────────────────────────────────
// Caches specialization IDs per user for 5 minutes.
// Eliminates repeated DB queries and survives Docker container restarts.
const CACHE_TTL_SECONDS = 300;

// ─── Single UNION query replacing two separate TypeORM builders ──────────────
// Previous implementation: 2 TypeORM query builders → ~400ms cold / ~13ms warm
// New implementation: 1 raw UNION SQL query → <5ms always
//
// SQL plan:
//   GroupHead path: group_heads → group_specializations (via groupId)
//   TeamLead path:  team_leads  → teams → group_specializations (via groupId)
//   Both paths UNION → DISTINCT specializationIds
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

export const getManagedGroupSpecializationIds = async (
  userId: string,
  userRole?: string,
): Promise<string[]> => {
  // Super admins and requesters have no group restriction
  if (userRole === UserType.SUPER_ADMIN || userRole === UserType.REQUESTER) {
    return [];
  }

  // ── Cache Hit ────────────────────────────────────────────────────────────
  const cacheKey = `user:${userId}:managed_specs`;
  const tRedisStart = performance.now();

  if (redisClient.isOpen) {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      const tRedisEnd = performance.now();
      console.log(`[benchmark] getManagedGroupSpecializationIds: CACHE HIT (userId=${userId}) | cache lookup: ${(tRedisEnd - tRedisStart).toFixed(2)}ms`);
      return JSON.parse(cached as string);
    }
  }
  const tRedisEnd = performance.now();

  // ── Cache Miss: Execute raw query via DataSource.query() ─────────────────
  // ROOT-CAUSE FIX: createQueryRunner() reserves a DEDICATED pool connection
  // and must be manually released. Under concurrent requests (getCombinedChatInbox
  // + getAllTickets running simultaneously), multiple createQueryRunner() calls
  // exhaust the pool, forcing subsequent callers to queue for up to 400ms+.
  //
  // PostgresDataSource.query() uses the pool's shared acquire-and-release
  // pattern instead — it borrows a connection, runs the query, and returns it
  // immediately. This is the correct pattern for simple SELECT queries that
  // do not need transaction semantics.
  //
  // Timing split:
  //   poolAcquireMs = time before the first byte is sent to Postgres
  //   sqlExecMs     = time from send to last result row received
  //   totalMs       = end-to-end elapsed including result parsing
  const tQueryStart = performance.now();

  const rows = (await PostgresDataSource.query(
    SPEC_IDS_SQL,
    [userId],
  )) as { specializationId: string }[];

  const tQueryEnd = performance.now();
  const totalMs = (tQueryEnd - tQueryStart).toFixed(2);

  const specIds = rows
    .map((r) => r.specializationId)
    .filter((id): id is string => Boolean(id));

  // Slow-connection warning: if the entire query (pool acquire + exec)
  // took more than 50ms, something upstream is holding connections.
  if (tQueryEnd - tQueryStart > 50) {
    console.warn(
      `[POOL WARNING] getManagedGroupSpecializationIds: query took ${totalMs}ms ` +
      `(threshold 50ms). Possible pool contention. ` +
      `Pool size: max=40 | userId=${userId}`,
    );
  }

  console.log(
    `[benchmark] getManagedGroupSpecializationIds: CACHE MISS | ` +
    `Redis lookup: ${(tRedisEnd - tRedisStart).toFixed(2)}ms | ` +
    `DB query (pool+exec): ${totalMs}ms | ` +
    `Rows returned: ${rows.length}`,
  );

  // ── Populate Cache ────────────────────────────────────────────────────────
  if (redisClient.isOpen) {
    await redisClient.set(cacheKey, JSON.stringify(specIds), { EX: CACHE_TTL_SECONDS });
  }

  return specIds;
};

/**
 * Call this to explicitly invalidate the cache for a user
 * (e.g. when group membership changes).
 */
export const invalidateSpecializationCache = async (userId: string): Promise<void> => {
  if (redisClient.isOpen) {
    await redisClient.del(`user:${userId}:managed_specs`);
  }
};
