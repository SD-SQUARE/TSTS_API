import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Performance: Add missing indexes for permission resolution queries
 *
 * Resolves ~400ms latency on GET /tickets caused by sequential scans on:
 * - group_heads (no index on userId or groupId)
 * - group_specializations (no index on groupId or specializationId)
 * - tickets (no index on requesterId, status, or createdAt)
 *
 * These indexes are required for the getManagedGroupSpecializationIds function
 * and the ticket access filter queries to use index scans instead of seq scans.
 */
export class AddPermissionAndTicketIndexes1778800000000
  implements MigrationInterface
{
  name = "AddPermissionAndTicketIndexes1778800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // group_heads: index on userId (WHERE clause) and groupId (JOIN condition)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_group_heads_userId" ON "group_heads" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_group_heads_groupId" ON "group_heads" ("groupId")`,
    );

    // group_specializations: index on groupId (JOIN) and specializationId (SELECT)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_group_specializations_groupId" ON "group_specializations" ("groupId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_group_specializations_specializationId" ON "group_specializations" ("specializationId")`,
    );

    // tickets: index on requesterId (access filter), status (filter), createdAt (ORDER BY)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tickets_requesterId" ON "tickets" ("requesterId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tickets_status" ON "tickets" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tickets_createdAt" ON "tickets" ("createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_group_heads_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_group_heads_groupId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_group_specializations_groupId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_group_specializations_specializationId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_requesterId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_createdAt"`);
  }
}
