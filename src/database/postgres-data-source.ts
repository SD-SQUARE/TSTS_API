import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import logger from "../utils/logger.js";
import { __dirname } from "../utils/paths.js";
import * as entities from "../entities/index.js";


dotenv.config({ path: path.join(__dirname, "src/.env") });

const HOST = process.env.DB_HOST ?? "localhost";
const PORT = process.env.DB_PORT ?? 5432;
const DATABASE = process.env.DB_NAME ?? "mydb";
const USER = process.env.DB_USER ?? "postgres";
const PASSWORD = process.env.DB_PASS ?? "postgres";
const isSync = process.env.NODE_ENV === "development";

export const PostgresDataSource = new DataSource({
  type: "postgres",
  host: HOST ?? "localhost",
  port: Number(PORT ?? 5432),
  username: USER ?? "postgres",
  password: PASSWORD ?? "postgres",
  database: DATABASE ?? "mydb",
  synchronize: isSync, // true in dev only; use migrations in prod
  logging: true,
  logger: "file",
  migrationsTableName: "migrations",
  migrations: [path.join(__dirname, "src/migrations/*.ts")],
  entities: Object.values(entities),
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
      logger.info(`[postgres] Database HOST: pg://${process.env.DB_HOST}:${process.env.DB_PORT}`);
      logger.info(`[postgres] Database Connected: ${PostgresDataSource.options.database}`);
    }
    return PostgresDataSource;
  } catch (err) {
    logger.error(`[postgres] Error initializing database: ${err.message}`);
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
    logger.info(`[postgres] Database HOST: pg://${process.env.DB_HOST}:${process.env.DB_PORT}`);
    logger.info(`[postgres] Database Disconnected: ${PostgresDataSource.options.database}`
    );
  }
}