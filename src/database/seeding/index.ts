import { seedUniversities } from "./universities.seed.js";
import { seedDomains } from "./domains.seed.js";
import { seedDepartments } from "./departments.seed.js";
import { PostgresDataSource } from "../postgres-data-source.js";
import { seedPermissionProfiles } from "./permission-profiles.seed.js";
import { seedPermissions } from "./permissions.seed.js";
import { seedAdmins } from "./admins.seed.js";
import { seedTechnicians } from "./technicians.seed.js";
import { seedRequesters } from "./requesters.seed.js";
import { seedGroups } from "./groups.seed.js";
import { seedGroupRelations } from "./group-relations.seed.js";
import { addAvatarsToUsers } from "./seedAvatars.js";
import { seedSpecializations } from "./specializations.seed.js";

export async function runSeeds() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    console.log("🚀 Starting database seeding...");

    // Order is important because of FK dependencies


    await seedSpecializations(PostgresDataSource);
    await seedUniversities(PostgresDataSource);
    await seedDomains(PostgresDataSource);
    await seedDepartments(PostgresDataSource);

    await seedPermissions(PostgresDataSource);
    await seedPermissionProfiles(PostgresDataSource);

    await seedGroups(PostgresDataSource);

    // 2) dynamic admins (random uni/domain/dept/profile/specs)
    await seedAdmins(PostgresDataSource, 50);

    await seedTechnicians(PostgresDataSource, 50);
    await seedRequesters(PostgresDataSource, 50);

    // await addAvatarsToUsers(PostgresDataSource);

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