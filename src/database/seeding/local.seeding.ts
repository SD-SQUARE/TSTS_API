import { PostgresDataSource } from "../postgres-data-source.js";
import { seedAdmins } from "./users/admins.seed.js";
import { seedRequesters } from "./users/requesters.seed.js";
import { seedTechnicians } from "./users/technicians.seed.js";
import { seedGroupRelations } from "./groups/group-relations.seed.js";
import { seedTickets } from "./tickets/tickets.seed.js";
import { MongoDataSource } from "../mongo-data-source.js";

export async function runLocalSeeds() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    if (!MongoDataSource.isInitialized) {
      await MongoDataSource.initialize();
    }

    console.log("🚀 Starting local database seeding...");

    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("👤 Seeding users...");
    await seedAdmins(PostgresDataSource, 10);
    await seedTechnicians(PostgresDataSource, 50);
    await seedRequesters(PostgresDataSource, 50);

    console.log("🔗 Seeding group relations...");
    await seedGroupRelations(PostgresDataSource);

    console.log("🎫 Seeding tickets...");
    await seedTickets(PostgresDataSource, 50);

    console.log("🎉 Local seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

const isMain = process.argv[1]?.endsWith("local.seeding.ts") || process.argv[1]?.endsWith("local.seeding.js");
if (isMain) {
  runLocalSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
    .finally(async () => {
      if (PostgresDataSource.isInitialized) await PostgresDataSource.destroy();
      if (MongoDataSource.isInitialized) await MongoDataSource.destroy();
    });
}
