import { PostgresDataSource } from "../postgres-data-source.js";
import { seedCapitalUniversityDomains } from "./domains/capital-university/capitalUniversityDomainSeeder.js";
import { seedUniversities } from "./university/universities.seed.js";
import { seedSpecializations } from "./specializations/specializations.seed.js";
import { seedHelwanNationalUniversityDomains } from "./domains/helwan-national-university/helwanNationalUniversityDomainSeeder.js";
import { seedSuperAdmin } from "./users/super-admin.seed.js";
import { seedGroups } from "./groups/groups.seed.js";
import { seedPermissions } from "./permissions/permissions.seed.js";
import { seedPermissionProfiles } from "./permissions/permission-profiles.seed.js";
import { seedProblems } from "./problems/problems.seed.js";
import { seedKnowledgeBase } from "./knowledge-base/knowledge-base.seed.js";
import { seedAuditActions } from "./auditActions/seedAuditActions.js";
import { MongoDataSource } from "../mongo-data-source.js";
import { seedReports } from "./reports/reports.seed.js";
import { seedStoredProcedures } from "../stored-procedures/seed-sp.js";

export async function runSystemSeeds() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    if (!MongoDataSource.isInitialized) {
      await MongoDataSource.initialize();
    }

    console.log("🚀 Starting database system seeding...");

    // Order is important because of FK dependencies

    console.log("📋 Seeding specializations...");
    await seedSpecializations(PostgresDataSource);

    console.log("🔧 Seeding problems...");
    await seedProblems(PostgresDataSource);

    // Small pause after problems seeding to help with memory
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("🏫 Seeding universities...");
    await seedUniversities(PostgresDataSource);

    console.log("🏛️  Seeding university domains...");
    await seedCapitalUniversityDomains(PostgresDataSource);
    await seedHelwanNationalUniversityDomains(PostgresDataSource);

    console.log("🔐 Seeding permissions...");
    await seedPermissions(PostgresDataSource);
    await seedPermissionProfiles(PostgresDataSource);

    console.log("👥 Seeding groups...");
    await seedGroups(PostgresDataSource);

    console.log("👤 Seeding SuperAdmin...");
    await seedSuperAdmin(PostgresDataSource);

    console.log("📚 Seeding knowledge base...");
    await seedKnowledgeBase(PostgresDataSource);

    console.log("📃 seeding audit actions...");
    await seedAuditActions(MongoDataSource);

    console.log("📃 seeding reports...");
    await seedReports(PostgresDataSource);

    console.log("📃 seeding stored-procedures...");
    await seedStoredProcedures(PostgresDataSource);

    console.log("🎉 Seeding system completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

// Only run directly when this file is the entry point
const isMain = process.argv[1]?.endsWith("system.seeding.ts") || process.argv[1]?.endsWith("system.seeding.js");
if (isMain) {
  runSystemSeeds()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
    .finally(async () => {
      if (PostgresDataSource.isInitialized) await PostgresDataSource.destroy();
      if (MongoDataSource.isInitialized) await MongoDataSource.destroy();
    });
}
