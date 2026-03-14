import { PostgresDataSource } from "../postgres-data-source.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Seed stored procedures into the database
 */
async function seedStoredProcedures() {
  try {
    console.log("🔄 Initializing database connection...");
    
    // Initialize data source if not already initialized
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    console.log("✅ Database connected successfully");

    // Read all SQL files in the stored-procedures directory (exclude test files)
    const spDirectory = __dirname;
    const sqlFiles = fs
      .readdirSync(spDirectory)
      .filter((file) => file.endsWith(".sql") && !file.startsWith("test-"));

    if (sqlFiles.length === 0) {
      console.log("⚠️  No SQL files found in stored-procedures directory");
      return;
    }

    console.log(`📂 Found ${sqlFiles.length} stored procedure(s) to seed`);

    // Execute each SQL file
    for (const sqlFile of sqlFiles) {
      const filePath = path.join(spDirectory, sqlFile);
      const sqlContent = fs.readFileSync(filePath, "utf-8");

      console.log(`\n🔧 Executing: ${sqlFile}`);

      try {
        await PostgresDataSource.query(sqlContent);
        console.log(`✅ Successfully created/updated: ${sqlFile}`);
      } catch (error: any) {
        console.error(`❌ Error executing ${sqlFile}:`, error.message);
        throw error;
      }
    }

    console.log("\n🎉 All stored procedures seeded successfully!");
  } catch (error: any) {
    console.error("❌ Error seeding stored procedures:", error.message);
    process.exit(1);
  } finally {
    // Close database connection
    if (PostgresDataSource.isInitialized) {
      await PostgresDataSource.destroy();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the seeding
seedStoredProcedures();
