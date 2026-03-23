import { PostgresDataSource } from "../postgres-data-source.js";
import { seedCapitalUniversityDomains } from "./domains/capital-university/capitalUniversityDomainSeeder.js";
import { seedUniversities } from "./university/universities.seed.js";
import { seedSpecializations } from "./specializations/specializations.seed.js";
import { seedHelwanNationalUniversityDomains } from "./domains/helwan-national-university/helwanNationalUniversityDomainSeeder.js";
import { seedSuperAdmin } from "./users/super-admin.seed.js";
import { seedAdmins } from "./users/admins.seed.js";
import { seedRequesters } from "./users/requesters.seed.js";
import { seedTechnicians } from "./users/technicians.seed.js";
import { seedGroups } from "./groups/groups.seed.js";
import { seedGroupRelations } from "./groups/group-relations.seed.js";
import { seedPermissions } from "./permissions/permissions.seed.js";
import { seedPermissionProfiles } from "./permissions/permission-profiles.seed.js";
import { seedProblems } from "./problems/problems.seed.js";
import { seedKnowledgeBase } from "./knowledge-base/knowledge-base.seed.js";
import { seedTickets } from "./tickets/tickets.seed.js";
import { seedAuditActions } from "./auditActions/seedAuditActions.js";
import { MongoDataSource } from "../mongo-data-source.js";

export async function runSeeds() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    if(!MongoDataSource.isInitialized) {
      await MongoDataSource.initialize();
    }

    console.log("🚀 Starting database seeding...");

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

    console.log("👤 Seeding users...");
    await seedSuperAdmin(PostgresDataSource);
    await seedAdmins(PostgresDataSource, 10);
    await seedTechnicians(PostgresDataSource, 50);
    await seedRequesters(PostgresDataSource, 50);

    console.log("🔗 Seeding group relations...");
    await seedGroupRelations(PostgresDataSource);

    console.log("📚 Seeding knowledge base...");
    await seedKnowledgeBase(PostgresDataSource);

    console.log("🎫 Seeding tickets...");
    await seedTickets(PostgresDataSource, 50);

    console.log("📃 seeding audit actions...");
    await seedAuditActions(MongoDataSource);
    

    console.log("🎉 Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exitCode = 1;
  } finally {
    if (PostgresDataSource.isInitialized) {
      await PostgresDataSource.destroy();
    }
  }
}

runSeeds();
