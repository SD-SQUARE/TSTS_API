import { PostgresDataSource } from "../postgres-data-source.js";
import { MongoDataSource } from "../mongo-data-source.js";
import { runSystemSeeds } from "./system.seeding.js";
import { runLocalSeeds } from "./local.seeding.js";

async function main() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }
    if (!MongoDataSource.isInitialized) {
      await MongoDataSource.initialize();
    }

    await runSystemSeeds();
    await runLocalSeeds();

    console.log("🎉 All seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    if (PostgresDataSource.isInitialized) await PostgresDataSource.destroy();
    if (MongoDataSource.isInitialized) await MongoDataSource.destroy();
  }
}

main();
