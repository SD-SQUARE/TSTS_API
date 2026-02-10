import { seedDomains } from "./domains.seed.js";
import { seedDepartments } from "./departments.seed.js";
import { PostgresDataSource } from "../postgres-data-source.js";
import { seedPermissionProfiles } from "./permission-profiles.seed.js";
import { seedPermissions } from "./permissions.seed.js";
import { seedCapitalUniversityDomains } from "./domains/capital-university/capitalUniversityDomainSeeder.js";
import { seedUniversities } from "./university/universities.seed.js";
import { seedSpecializations } from "./specializations/specializations.seed.js";
import { seedHelwanNationalUniversityDomains } from "./domains/helwan-national-university/helwanNationalUniversityDomainSeeder.js";
import { seedAdmins } from "./users/admins.seed.js";
import { seedRequesters } from "./users/requesters.seed.js";
import { seedTechnicians } from "./users/technicians.seed.js";
import { seedGroups } from "./groups-new/groups.seed.js";
import { seedGroupRelations } from "./groups-new/group-relations.seed.js";

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

    // await seedDepartments(PostgresDataSource);

    await seedPermissions(PostgresDataSource);
    await seedPermissionProfiles(PostgresDataSource);

    await seedGroups(PostgresDataSource);

    // 2) dynamic admins (random uni/domain/dept/profile/specs)
    await seedAdmins(PostgresDataSource, 10);
    await seedTechnicians(PostgresDataSource, 50);
    await seedRequesters(PostgresDataSource, 50);

    // 4) group ↔ specs & group ↔ heads
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
