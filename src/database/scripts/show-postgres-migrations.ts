import { PostgresDataSource } from "../postgres-data-source.js";

async function showPostgresMigrations() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    const hasPendingMigrations = await PostgresDataSource.showMigrations();
    console.log(
      `[postgres] Pending migrations: ${hasPendingMigrations ? "yes" : "no"}`,
    );
  } catch (error) {
    console.error(
      `[postgres] Failed to inspect migrations: ${(error as Error).message}`,
    );
    process.exitCode = 1;
  } finally {
    if (PostgresDataSource.isInitialized) {
      await PostgresDataSource.destroy();
    }
  }
}

showPostgresMigrations();
