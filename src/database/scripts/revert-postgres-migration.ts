import { PostgresDataSource } from "../postgres-data-source.js";

async function revertPostgresMigration() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    await PostgresDataSource.undoLastMigration({
      transaction: "all",
    });

    console.log(
      `[postgres] Reverted the latest migration on ${PostgresDataSource.options.database}`,
    );
  } catch (error) {
    console.error(
      `[postgres] Failed to revert migration: ${(error as Error).message}`,
    );
    process.exitCode = 1;
  } finally {
    if (PostgresDataSource.isInitialized) {
      await PostgresDataSource.destroy();
    }
  }
}

revertPostgresMigration();
