import { AuditAction, AuditLog } from "../../entities/mongo-entities/Index.js";
import type { MongoMigration } from "./types.js";

export const bootstrapAuditSchema202604100001: MongoMigration = {
  id: "202604100001",
  description: "bootstrap audit collections and indexes",
  async up({ dataSource, db }) {
    const auditLogCollection = dataSource.getMetadata(AuditLog).tableName;
    const auditActionCollection = dataSource.getMetadata(AuditAction).tableName;

    const existingCollections = await db.listCollections().toArray();
    const existingCollectionNames = new Set(
      existingCollections.map((collection) => collection.name),
    );

    if (!existingCollectionNames.has(auditLogCollection)) {
      await db.createCollection(auditLogCollection);
    }

    if (!existingCollectionNames.has(auditActionCollection)) {
      await db.createCollection(auditActionCollection);
    }

    await db.collection(auditActionCollection).createIndex(
      { key: 1 },
      {
        name: "audit_actions_key_uq",
        unique: true,
      },
    );

    await db.collection(auditLogCollection).createIndexes([
      {
        key: { createdAt: -1 },
        name: "audit_logs_created_at_idx",
      },
      {
        key: { action: 1, status: 1, createdAt: -1 },
        name: "audit_logs_action_status_created_at_idx",
      },
      {
        key: { "actor.id": 1, createdAt: -1 },
        name: "audit_logs_actor_id_created_at_idx",
      },
    ]);
  },
};
