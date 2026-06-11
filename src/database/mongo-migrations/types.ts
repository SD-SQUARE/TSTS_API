import type { Db } from "mongodb";
import type { DataSource } from "typeorm";

export type MongoMigrationContext = {
  dataSource: DataSource;
  db: Db;
};

export type MongoMigration = {
  id: string;
  description: string;
  up: (context: MongoMigrationContext) => Promise<void>;
};
