import type { Db, MongoClient } from "mongodb";
import type { DataSource } from "typeorm";
import { bootstrapAuditSchema202604100001 } from "./202604100001-bootstrap-audit-schema.js";
import type { MongoMigration } from "./types.js";

const migrationsCollectionName = "mongo_migrations";
const migrations: MongoMigration[] = [bootstrapAuditSchema202604100001];

type ExecutedMongoMigration = {
  id: string;
  description: string;
  executedAt: Date;
};

function getMongoDb(dataSource: DataSource): Db {
  const mongoQueryRunner = dataSource.mongoManager.mongoQueryRunner as unknown as {
    databaseConnection: MongoClient;
  };

  return mongoQueryRunner.databaseConnection.db(
    dataSource.options.database as string,
  );
}

export async function runMongoMigrations(dataSource: DataSource) {
  const shouldDestroy = !dataSource.isInitialized;

  if (shouldDestroy) {
    await dataSource.initialize();
  }

  try {
    const db = getMongoDb(dataSource);
    const migrationsCollection =
      db.collection<ExecutedMongoMigration>(migrationsCollectionName);

    await migrationsCollection.createIndex({ id: 1 }, { unique: true });

    const executedIds = new Set(
      (
        await migrationsCollection.find({}, { projection: { id: 1 } }).toArray()
      ).map((migration) => migration.id),
    );

    const applied: string[] = [];

    for (const migration of migrations) {
      if (executedIds.has(migration.id)) {
        continue;
      }

      await migration.up({ dataSource, db });
      await migrationsCollection.insertOne({
        id: migration.id,
        description: migration.description,
        executedAt: new Date(),
      });
      applied.push(migration.id);
    }

    return applied;
  } finally {
    if (shouldDestroy && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

export async function showMongoMigrations(
  dataSource: DataSource,
) {
  const shouldDestroy = !dataSource.isInitialized;

  if (shouldDestroy) {
    await dataSource.initialize();
  }

  try {
    const db = getMongoDb(dataSource);
    const migrationsCollection =
      db.collection<ExecutedMongoMigration>(migrationsCollectionName);

    const applied = await migrationsCollection
      .find({}, { projection: { _id: 0 } })
      .sort({ executedAt: 1 })
      .toArray();

    const appliedIds = new Set(applied.map((migration) => migration.id));
    const pending = migrations
      .filter((migration) => !appliedIds.has(migration.id))
      .map((migration) => ({
        id: migration.id,
        description: migration.description,
      }));

    return { applied, pending };
  } catch (error) {
    const mongoError = error as { code?: number };
    if (mongoError.code === 26) {
      return {
        applied: [] as ExecutedMongoMigration[],
        pending: migrations.map((migration) => ({
          id: migration.id,
          description: migration.description,
        })),
      };
    }

    throw error;
  } finally {
    if (shouldDestroy && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}
