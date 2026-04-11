import { DataSource } from "typeorm";
import { PostgresDataSource } from "../postgres-data-source.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed stored procedures into the database
 */
export async function seedStoredProcedures(dataSource: DataSource) {
  // Read all SQL files in the stored-procedures directory (exclude test files)
  const spDirectory = __dirname;
  const sqlFiles = fs
    .readdirSync(spDirectory)
    .filter((file) => file.endsWith(".sql") && !file.startsWith("test-"));

  if (sqlFiles.length === 0) {
    console.log("⚠️ [StoredProceduresSeed] No SQL files found");
    return;
  }

  console.log(
    `📂 [StoredProceduresSeed] Found ${sqlFiles.length} stored procedure(s) to seed`,
  );

  for (const sqlFile of sqlFiles) {
    const filePath = path.join(spDirectory, sqlFile);
    const sqlContent = fs.readFileSync(filePath, "utf-8");

    console.log(`🔧 [StoredProceduresSeed] Executing: ${sqlFile}`);

    try {
      await dataSource.query(sqlContent);
      console.log(
        `✅ [StoredProceduresSeed] Successfully created/updated: ${sqlFile}`,
      );
    } catch (error: any) {
      console.error(
        `❌ [StoredProceduresSeed] Error executing ${sqlFile}:`,
        error.message,
      );
      throw error;
    }
  }

  console.log(
    "🎉 [StoredProceduresSeed] All stored procedures seeded successfully!",
  );
}

/**
 * Standalone runner for npm script
 */
async function runStoredProceduresSeeding() {
  try {
    console.log("🚀 Starting stored procedures seeding...");

    if (!PostgresDataSource.isInitialized) {
      console.log("📡 Initializing database connection...");
      await PostgresDataSource.initialize();
      console.log("✅ Database connected");
    }

    await seedStoredProcedures(PostgresDataSource);
    console.log("🎉 Stored procedures seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during stored procedures seeding:", error);
    process.exitCode = 1;
  } finally {
    if (PostgresDataSource.isInitialized) {
      console.log("🔌 Closing database connection...");
      await PostgresDataSource.destroy();
    }

    process.exit(process.exitCode || 0);
  }
}

// Run the seeding
const isMain = process.argv[1]?.endsWith("seed-sp.ts") || process.argv[1]?.endsWith("seed-sp.js");
if (isMain) runStoredProceduresSeeding();
