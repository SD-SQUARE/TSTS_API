import { PostgresDataSource } from "../postgres-data-source.js";

async function runPostgresMigrations() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    const migrations = await PostgresDataSource.runMigrations({
      transaction: "all",
    });

    console.log(
      `[postgres] Applied ${migrations.length} migration(s) to ${PostgresDataSource.options.database}`,
    );
  } catch (error) {
    console.error(
      `[postgres] Failed to run migrations: ${(error as Error).message}`,
    );
    process.exitCode = 1;
  } finally {
    if (PostgresDataSource.isInitialized) {
      await PostgresDataSource.destroy();
    }
  }
}

runPostgresMigrations();
