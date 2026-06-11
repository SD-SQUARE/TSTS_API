import { MongoDataSource } from "../mongo-data-source.js";
import { runMongoMigrations, showMongoMigrations } from "./runner.js";

async function main() {
  const command = process.argv[2] ?? "run";

  try {
    if (command === "show") {
      const status = await showMongoMigrations(MongoDataSource);
      console.log(
        `[mongodb] Applied migrations: ${status.applied.length}, pending: ${status.pending.length}`,
      );

      if (status.pending.length > 0) {
        for (const migration of status.pending) {
          console.log(`[mongodb] pending ${migration.id} ${migration.description}`);
        }
      }

      return;
    }

    const applied = await runMongoMigrations(MongoDataSource);
    console.log(`[mongodb] Applied ${applied.length} migration(s)`);
  } catch (error) {
    console.error(
      `[mongodb] Migration command failed: ${(error as Error).message}`,
    );
    process.exitCode = 1;
  }
}

main();
