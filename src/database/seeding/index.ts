import { PostgresDataSource } from "../postgres-data-source.js";
import { seedDepartments } from "./departments/departmentsSeeder.js";
import { seedDomains } from "./domains/domainSeeders.js";
import { seedAllowedSpecializations } from "./groups/allowedSpecializationSeeder.js";
import { seedGroupHeads } from "./groups/groupHeadSeeder.js";
import { seedGroups } from "./groups/groupSeeder.js";
import { seedGroupSpecializations } from "./groups/groupSpecializationSeeder.js";
import { seedSpecializations } from "./groups/specializationSeeder.js";
import { seedPermissions } from "./permissions/permissionsSeeder.js";
import { seedUniversities } from "./university/universitySeeder.js";
import { seedPermissionProfiles } from "./users/permissionProfileSeeder.js";
import { seedUsersPermissions } from "./users/userPermissionSeeder.js";
import { seedUsers } from "./users/userSeeder.js";

async function runSeeders() {
  try {
    console.log("🚀 Initializing database connection...");

    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    console.log("✅ Database connected successfully\n");

    // Run all seeders in order (order matters for relationships!)
    console.log("📋 Step 1: Base Entities");
    await seedPermissions(); // Create individual permissions
    await seedPermissionProfiles(); // Create permission profiles
    await seedSpecializations(); // Create specializations
    await seedGroups(); // Create groups
    await seedUniversities(); // Create universities

    console.log("\n🏛️ Step 2: University Structure");
    await seedDomains(); // Create domains (faculties)
    await seedDepartments(); // Create departments

    console.log("\n👥 Step 3: Users");
    await seedUsers(); // Create users

    console.log("\n🔗 Step 4: Relationships");
    await seedUsersPermissions(); // Link users to permissions
    await seedGroupSpecializations(); // Link groups to specializations
    await seedGroupHeads(); // Assign group heads
    await seedAllowedSpecializations(); // Assign user specializations

    console.log("\n🎊 All seeders completed successfully!");
    await PostgresDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Seeding failed:", error);

    if (PostgresDataSource.isInitialized) {
      await PostgresDataSource.destroy();
    }

    process.exit(1);
  }
}

runSeeders();
