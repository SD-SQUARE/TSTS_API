// src/seeds/groupSpecializationSeeder.ts

import { Group } from "../../../entities/Group.js";
import { GroupSpecialization } from "../../../entities/GroupSpecialization.js";
import { Specialization } from "../../../entities/Specialization.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

interface GroupSpecMapping {
  groupName: string; // English name
  specializationNames: string[]; // English names
}

const groupSpecializationMappings: GroupSpecMapping[] = [
  {
    groupName: "Network Support Team",
    specializationNames: [
      "Network Administration",
      "Security & Firewall",
      "Telecommunications",
    ],
  },
  {
    groupName: "Hardware Team",
    specializationNames: ["Hardware Repair", "Printer & Scanner Support"],
  },
  {
    groupName: "Software Support Team",
    specializationNames: ["Software Support", "Web Development"],
  },
  {
    groupName: "Security Team",
    specializationNames: [
      "Security & Firewall",
      "Network Administration",
      "System Administration",
    ],
  },
  {
    groupName: "System Administration Team",
    specializationNames: [
      "System Administration",
      "Database Management",
      "Network Administration",
    ],
  },
  {
    groupName: "AV Support Team",
    specializationNames: ["Audio/Visual Support"],
  },
  {
    groupName: "General Support Team",
    specializationNames: [
      "Hardware Repair",
      "Software Support",
      "Printer & Scanner Support",
    ],
  },
];

export async function seedGroupSpecializations() {
  try {
    const groupSpecRepository =
      PostgresDataSource.getRepository(GroupSpecialization);
    const groupRepository = PostgresDataSource.getRepository(Group);
    const specializationRepository =
      PostgresDataSource.getRepository(Specialization);

    console.log("🌱 Starting group specialization seeding...");

    for (const mapping of groupSpecializationMappings) {
      // Find the group
      const group = await groupRepository
        .createQueryBuilder("grp")
        .where("grp.name->>'en' = :name", { name: mapping.groupName })
        .getOne();

      if (!group) {
        console.log(`⚠️  Group "${mapping.groupName}" not found, skipping...`);
        continue;
      }

      // Process each specialization for this group
      for (const specName of mapping.specializationNames) {
        const specialization = await specializationRepository
          .createQueryBuilder("spec")
          .where("spec.name->>'en' = :name", { name: specName })
          .getOne();

        if (!specialization) {
          console.log(
            `⚠️  Specialization "${specName}" not found, skipping...`
          );
          continue;
        }

        // Check if relationship already exists
        const existing = await groupSpecRepository.findOne({
          where: {
            group: { id: group.id },
            specialization: { id: specialization.id },
          },
        });

        if (existing) {
          console.log(
            `⏭️  "${mapping.groupName}" ↔ "${specName}" already linked, skipping...`
          );
          continue;
        }

        // Create the relationship
        const groupSpec = groupSpecRepository.create({
          group: group,
          specialization: specialization,
        });

        await groupSpecRepository.save(groupSpec);
        console.log(`✅ Linked "${mapping.groupName}" ↔ "${specName}"`);
      }
    }

    console.log("🎉 Group specialization seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding group specializations:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGroupSpecializations()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
