import { PostgresDataSource } from "../database/postgres-data-source.js";
import { invalidateTicketAnalyticsCache } from "./tickets/ticket-cache.service.js";

const getMetadataByName = (entityName: string) =>
  PostgresDataSource.entityMetadatas.find(
    (metadata) =>
      metadata.name.toLowerCase() === entityName.toLowerCase() ||
      metadata.tableName.toLowerCase() === entityName.toLowerCase(),
  );

export const listSoftDeleteEntities = async () => {
  const entities = await Promise.all(
    PostgresDataSource.entityMetadatas
      .filter((metadata) => metadata.deleteDateColumn)
      .map(async (metadata) => {
        const alias = "record";
        const deletedCount = await PostgresDataSource.getRepository(
          metadata.target as any,
        )
          .createQueryBuilder(alias)
          .withDeleted()
          .where(
            `${alias}."${metadata.deleteDateColumn!.databaseName}" IS NOT NULL`,
          )
          .getCount();

        if (deletedCount === 0) {
          return null;
        }

        return {
          key: metadata.name,
          tableName: metadata.tableName,
          label: metadata.name,
          deletedCount,
        };
      }),
  );

  return entities
    .filter(Boolean)
    .sort((a, b) => a!.label.localeCompare(b!.label));
};

const serializeRecord = (record: any, columns: string[]) => {
  const output: Record<string, any> = {};

  for (const column of columns) {
    const value = record[column];
    output[column] = value instanceof Date ? value.toISOString() : value;
  }

  return output;
};

export const listDeletedRecords = async (entityName: string) => {
  const metadata = getMetadataByName(entityName);
  if (!metadata?.deleteDateColumn) {
    return null;
  }

  const SENSITIVE_COLUMNS = ["password", "token", "secret", "salt", "hash"];

  const repo = PostgresDataSource.getRepository(metadata.target as any);
  const records = await repo.find({
    withDeleted: true,
    where: {
      [metadata.deleteDateColumn.propertyName]: PostgresDataSource.manager.connection.driver.escapeQueryWithParameters ? undefined : undefined // fallback, handled below using query builder equivalent
    },
    loadRelationIds: true,
    take: 100,
    order: {
      [metadata.deleteDateColumn.propertyName]: "DESC",
    } as any,
  });

  // Re-fetch using query builder to properly filter only deleted items
  const alias = metadata.tableName;
  const deletedRecords = await repo
    .createQueryBuilder(alias)
    .withDeleted()
    .where(`${alias}."${metadata.deleteDateColumn.databaseName}" IS NOT NULL`)
    .orderBy(`${alias}."${metadata.deleteDateColumn.databaseName}"`, "DESC")
    .take(100)
    .loadAllRelationIds()
    .getMany();

  // Extract columns dynamically from the fetched records
  const allKeys = new Set<string>();
  for (const record of deletedRecords) {
    Object.keys(record).forEach((key) => allKeys.add(key));
  }

  // Fallback to metadata columns if no records
  if (allKeys.size === 0) {
    metadata.columns.forEach((c) => allKeys.add(c.propertyName));
  }

  const columns = Array.from(allKeys).filter(
    (col) => !SENSITIVE_COLUMNS.some((sensitive) => col.toLowerCase().includes(sensitive)),
  );

  return {
    entity: metadata.name,
    tableName: metadata.tableName,
    columns,
    records: deletedRecords.map((record) => serializeRecord(record, columns)),
  };
};

export const restoreDeletedRecord = async (entityName: string, id: string) => {
  const metadata = getMetadataByName(entityName);
  if (!metadata?.deleteDateColumn) {
    return false;
  }

  const repo = PostgresDataSource.getRepository(metadata.target as any);
  await repo.restore(id);
  if (metadata.name === "Ticket") {
    await invalidateTicketAnalyticsCache();
  }
  return true;
};
