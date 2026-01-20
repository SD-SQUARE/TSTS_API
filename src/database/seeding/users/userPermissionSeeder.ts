import { PermissionProfile } from "../../../entities/PermissionProfile.js";
import { User } from "../../../entities/User.js";
import { UsersPermissions } from "../../../entities/UsersPermissions.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

interface UserPermissionMapping {
  userEmail: string;
  profileName: string; // English name of the permission profile
}

const userPermissionMappings: UserPermissionMapping[] = [
  {
    userEmail: "admin@example.com",
    profileName: "Super Admin",
  },
  {
    userEmail: "technician@example.com",
    profileName: "Technician",
  },
  {
    userEmail: "user@example.com",
    profileName: "User",
  },
];

export async function seedUsersPermissions() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    const usersPermissionsRepository =
      PostgresDataSource.getRepository(UsersPermissions);
    const userRepository = PostgresDataSource.getRepository(User);
    const permissionProfileRepository =
      PostgresDataSource.getRepository(PermissionProfile);

    console.log("🌱 Starting users permissions seeding...");

    for (const mapping of userPermissionMappings) {
      // Find the user
      const user = await userRepository.findOne({
        where: { email: mapping.userEmail },
      });

      if (!user) {
        console.log(`⚠️  User ${mapping.userEmail} not found, skipping...`);
        continue;
      }

      // Find the permission profile
      const profile = await permissionProfileRepository
        .createQueryBuilder("profile")
        .where("profile.name->>'en' = :name", { name: mapping.profileName })
        .getOne();

      if (!profile) {
        console.log(
          `⚠️  Permission profile "${mapping.profileName}" not found, skipping...`
        );
        continue;
      }

      // Check if the user-permission relationship already exists
      const existingPermission = await usersPermissionsRepository.findOne({
        where: {
          user: { id: user.id },
          permissionProfile: { id: profile.id },
        },
      });

      if (existingPermission) {
        console.log(
          `⏭️  Permission for ${mapping.userEmail} already exists, skipping...`
        );
        continue;
      }

      // Create the user permission
      const userPermission = usersPermissionsRepository.create({
        user: user,
        permissionProfile: profile,
      });

      await usersPermissionsRepository.save(userPermission);
      console.log(
        `✅ Assigned "${mapping.profileName}" to ${mapping.userEmail}`
      );
    }

    console.log("🎉 Users permissions seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding users permissions:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsersPermissions()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
