import { DataSource } from "typeorm";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

export const PostgresDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASS || "postgres",
  database: process.env.DB_NAME || "mydb",
  synchronize: process.env.NODE_ENV === "development", // true in dev only; use migrations in prod
  logging: true,
  logger: "file",
  migrationsTableName: "migrations",
  migrations: [path.join(__dirname, "../migrations/*.js")],
  entities: [path.join(__dirname, "../entities/*.js")],
});
