import { PostgresDataSource } from "../postgres-data-source.js";
import { seedCapitalUniversityDomains } from "./domains/capital-university/capitalUniversityDomainSeeder.js";
import { seedUniversities } from "./university/universities.seed.js";
import { seedSpecializations } from "./specializations/specializations.seed.js";
import { seedHelwanNationalUniversityDomains } from "./domains/helwan-national-university/helwanNationalUniversityDomainSeeder.js";
import { seedAdmins } from "./users/admins.seed.js";
import { seedRequesters } from "./users/requesters.seed.js";
import { seedTechnicians } from "./users/technicians.seed.js";
import { seedGroups } from "./groups/groups.seed.js";
import { seedGroupRelations } from "./groups/group-relations.seed.js";
import { seedPermissions } from "./permissions/permissions.seed.js";
import { seedPermissionProfiles } from "./permissions/permission-profiles.seed.js";

export async function runSeeds() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    console.log("🚀 Starting database seeding...");

    // Order is important because of FK dependencies

    await seedSpecializations(PostgresDataSource);
    await seedUniversities(PostgresDataSource);

    await seedCapitalUniversityDomains(PostgresDataSource);
    await seedHelwanNationalUniversityDomains(PostgresDataSource);

    await seedPermissions(PostgresDataSource);
    await seedPermissionProfiles(PostgresDataSource);

    await seedGroups(PostgresDataSource);

    await seedAdmins(PostgresDataSource, 10);
    await seedTechnicians(PostgresDataSource, 50);
    await seedRequesters(PostgresDataSource, 50);

    await seedGroupRelations(PostgresDataSource);

    console.log("🎉 Seeding completed successfully!");
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
