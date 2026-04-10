import dotenv from "dotenv";
import { DataSource } from "typeorm";
import logger from "../utils/logger.js";
import * as entities from "../entities/mongo-entities/Index.js";
import { runMongoMigrations } from "./mongo-migrations/runner.js";

dotenv.config();

const HOST = process.env.MONGO_HOST ?? "localhost";
const PORT = process.env.MONGO_PORT ?? "27017";
const USER = process.env.MONGO_USER ?? "root";
const PASSWORD = process.env.MONGO_PASSWORD ?? "root";
const DATABASE = process.env.MONGO_DB ?? "tsts_mongo";
const shouldSynchronize = process.env.MONGO_SYNC === "true";
const shouldLogQueries = process.env.NODE_ENV === "development";
const shouldRunMigrationsOnBoot = process.env.MONGO_RUN_MIGRATIONS === "true";

export const MongoDataSource = new DataSource({
  type: "mongodb",
  host: HOST,
  port: Number(PORT),
  username: USER,
  password: PASSWORD,
  database: DATABASE,
  authSource: "admin",
  synchronize: shouldSynchronize,
  logging: shouldLogQueries,
  entities: Object.values(entities),
});

export async function initMongoDataSource() {
  try {
    if (!MongoDataSource.isInitialized) {
      await MongoDataSource.initialize();

      logger.info(
        `[mongodb] Connected: mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
      );

      if (shouldRunMigrationsOnBoot) {
        const applied = await runMongoMigrations(MongoDataSource);
        logger.info(`[mongodb] Migrations completed: ${applied.length} applied`);
      }
    }

    return MongoDataSource;
  } catch (err) {
    const error = err as Error;
    logger.error(`[mongodb] Error initializing database: ${error.message}`);
    process.exit(1);
  }
}

export async function destroyMongoDataSource() {
  if (MongoDataSource.isInitialized) {
    await MongoDataSource.destroy();
    logger.info("[mongodb] Disconnected");
  }
}
