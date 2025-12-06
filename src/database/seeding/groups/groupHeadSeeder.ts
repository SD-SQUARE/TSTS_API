// src/seeds/groupHeadSeeder.ts

import { Group } from "../../../entities/Group.js";
import { GroupHead } from "../../../entities/GroupHead.js";
import { User } from "../../../entities/User.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

interface GroupHeadMapping {
  groupName: string; // English name
  userEmail: string;
}

const groupHeadMappings: GroupHeadMapping[] = [
  {
    groupName: "Network Support Team",
    userEmail: "admin@example.com",
  },
  {
    groupName: "Hardware Team",
    userEmail: "admin@example.com",
  },
  {
    groupName: "Software Support Team",
    userEmail: "technician@example.com",
  },
];

export async function seedGroupHeads() {
  try {
    const groupHeadRepository = PostgresDataSource.getRepository(GroupHead);
    const groupRepository = PostgresDataSource.getRepository(Group);
    const userRepository = PostgresDataSource.getRepository(User);

    console.log("🌱 Starting group head seeding...");

    for (const mapping of groupHeadMappings) {
      // Find the group
      const group = await groupRepository
        .createQueryBuilder("grp")
        .where("grp.name->>'en' = :name", { name: mapping.groupName })
        .getOne();

      if (!group) {
        console.log(`⚠️  Group "${mapping.groupName}" not found, skipping...`);
        continue;
      }

      // Find the user
      const user = await userRepository.findOne({
        where: { email: mapping.userEmail },
      });

      if (!user) {
        console.log(`⚠️  User "${mapping.userEmail}" not found, skipping...`);
        continue;
      }

      // Check if relationship already exists
      const existing = await groupHeadRepository.findOne({
        where: {
          group: { id: group.id },
          user: { id: user.id },
        },
      });

      if (existing) {
        console.log(
          `⏭️  ${mapping.userEmail} already head of "${mapping.groupName}", skipping...`
        );
        continue;
      }

      // Create the group head relationship
      const groupHead = groupHeadRepository.create({
        group: group,
        user: user,
      });

      await groupHeadRepository.save(groupHead);
      console.log(
        `✅ Set ${mapping.userEmail} as head of "${mapping.groupName}"`
      );
    }

    console.log("🎉 Group head seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding group heads:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGroupHeads()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
