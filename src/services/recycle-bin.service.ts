import { PostgresDataSource } from "../database/postgres-data-source.js";

const getMetadataByName = (entityName: string) =>
  PostgresDataSource.entityMetadatas.find(
    (metadata) =>
      metadata.name.toLowerCase() === entityName.toLowerCase() ||
      metadata.tableName.toLowerCase() === entityName.toLowerCase(),
  );

export const listSoftDeleteEntities = () =>
  PostgresDataSource.entityMetadatas
    .filter((metadata) => metadata.deleteDateColumn)
    .map((metadata) => ({
      key: metadata.name,
      tableName: metadata.tableName,
      label: metadata.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

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

  const columns = metadata.columns.map((column) => column.propertyName);
  const alias = metadata.tableName;
  const records = await PostgresDataSource.getRepository(metadata.target as any)
    .createQueryBuilder(alias)
    .withDeleted()
    .where(`${alias}."${metadata.deleteDateColumn.databaseName}" IS NOT NULL`)
    .orderBy(`${alias}."${metadata.deleteDateColumn.databaseName}"`, "DESC")
    .take(100)
    .getMany();

  return {
    entity: metadata.name,
    tableName: metadata.tableName,
    columns,
    records: records.map((record) => serializeRecord(record, columns)),
  };
};

export const restoreDeletedRecord = async (entityName: string, id: string) => {
  const metadata = getMetadataByName(entityName);
  if (!metadata?.deleteDateColumn) {
    return false;
  }

  const repo = PostgresDataSource.getRepository(metadata.target as any);
  await repo.restore(id);
  return true;
};

export const updateDeletedRecord = async (
  entityName: string,
  id: string,
  data: Record<string, any>,
) => {
  const metadata = getMetadataByName(entityName);
  if (!metadata?.deleteDateColumn) {
    return null;
  }

  const editableColumns = metadata.columns
    .filter(
      (column) =>
        !column.isPrimary &&
        !column.isGenerated &&
        column.propertyName !== metadata.deleteDateColumn?.propertyName &&
        column.propertyName !== metadata.createDateColumn?.propertyName &&
        column.propertyName !== metadata.updateDateColumn?.propertyName,
    )
    .map((column) => column.propertyName);

  const sanitized = Object.fromEntries(
    Object.entries(data).filter(([key]) => editableColumns.includes(key)),
  );

  if (Object.keys(sanitized).length) {
    await PostgresDataSource.getRepository(metadata.target as any)
      .createQueryBuilder()
      .update()
      .set(sanitized)
      .where("id = :id", { id })
      .execute();
  }

  return listDeletedRecords(entityName);
};
