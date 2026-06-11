import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import logger from "../utils/logger.js";
import * as entities from "../entities/index.js";

dotenv.config();

const HOST = process.env.DB_HOST ?? "localhost";
const PORT = process.env.DB_PORT ?? 5432;
const DATABASE = process.env.DB_NAME ?? "mydb";
const USER = process.env.DB_USER ?? "postgres";
const PASSWORD = process.env.DB_PASS ?? "postgres";
const isProduction = process.env.NODE_ENV === "production";
const shouldSynchronize = process.env.DB_SYNC === "true" && !isProduction;
const shouldLogQueries = process.env.NODE_ENV === "development";
const shouldRunMigrationsOnBoot = process.env.DB_RUN_MIGRATIONS === "true";

const currentFilePath = fileURLToPath(import.meta.url);
const runtimeDirectory = currentFilePath.includes(`${path.sep}dist${path.sep}`)
  ? "dist"
  : "src";
const migrationsGlob = path.join(
  process.cwd(),
  runtimeDirectory,
  "migrations",
  "*.{ts,js}",
);

export const PostgresDataSource = new DataSource({
  type: "postgres",
  host: HOST,
  port: Number(PORT),
  username: USER,
  password: PASSWORD,
  database: DATABASE,
  synchronize: shouldSynchronize,
  logging: shouldLogQueries,
  logger: "advanced-console",
  migrationsTableName: "migration",
  migrations: [migrationsGlob],
  entities: Object.values(entities),
  metadataTableName: "typeorm_metadata",
  extra: {
    max: 40,
    statement_timeout: 5000,
  },
});

/**
 * Initializes the Postgres data source if it hasn't been initialized already.
 * If the data source is already initialized, this function does nothing.
 * @returns {Promise<Postgres.DataSource>} The initialized Postgres data source.
 */
export async function initDataSource() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
      logger.info(
        `[postgres] Database HOST: pg://${process.env.DB_HOST}:${process.env.DB_PORT}`,
      );
      logger.info(
        `[postgres] Database Connected: ${PostgresDataSource.options.database}`,
      );

      if (shouldRunMigrationsOnBoot) {
        logger.info("[postgres] Running pending migrations...");
        const executedMigrations = await PostgresDataSource.runMigrations({
          transaction: "all",
        });
        logger.info(
          `[postgres] Migrations completed: ${executedMigrations.length} applied`,
        );
      }
    }
    return PostgresDataSource;
  } catch (err) {
    const error = err as Error;
    logger.error(`[postgres] Error initializing database: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Destroys the Postgres data source if it has been initialized.
 *This function does nothing if the data source has not been initialized.
 *Use this function to clean up the data source before the program exits.
 * @returns {Promise<void>} A promise that resolves when the data source has been destroyed.
 */
export async function destroyDataSource() {
  if (PostgresDataSource.isInitialized) {
    await PostgresDataSource.destroy();
    logger.info(
      `[postgres] Database HOST: pg://${process.env.DB_HOST}:${process.env.DB_PORT}`,
    );
    logger.info(
      `[postgres] Database Disconnected: ${PostgresDataSource.options.database}`,
    );
  }
}
