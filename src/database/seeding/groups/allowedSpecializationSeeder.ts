// src/seeds/allowedSpecializationSeeder.ts

import { AllowedSpecialization } from "../../../entities/AllowedSpecialization.js";
import { Specialization } from "../../../entities/Specialization.js";
import { User } from "../../../entities/User.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

interface UserSpecMapping {
  userEmail: string;
  specializationNames: string[]; // English names
}

const userSpecializationMappings: UserSpecMapping[] = [
  {
    userEmail: "admin@example.com",
    specializationNames: [
      "Network Administration",
      "System Administration",
      "Security & Firewall",
      "Hardware Repair",
      "Software Support",
    ],
  },
  {
    userEmail: "technician@example.com",
    specializationNames: [
      "Hardware Repair",
      "Software Support",
      "Network Administration",
      "Printer & Scanner Support",
    ],
  },
  {
    userEmail: "user@example.com",
    specializationNames: ["Software Support"],
  },
];

export async function seedAllowedSpecializations() {
  try {
    const allowedSpecRepository = PostgresDataSource.getRepository(
      AllowedSpecialization,
    );
    const userRepository = PostgresDataSource.getRepository(User);
    const specializationRepository =
      PostgresDataSource.getRepository(Specialization);

    console.log("🌱 Starting allowed specialization seeding...");

    for (const mapping of userSpecializationMappings) {
      // Find the user
      const user = await userRepository.findOne({
        where: { email: mapping.userEmail },
      });

      if (!user) {
        console.log(`⚠️  User "${mapping.userEmail}" not found, skipping...`);
        continue;
      }

      // Process each specialization for this user
      for (const specName of mapping.specializationNames) {
        const specialization = await specializationRepository
          .createQueryBuilder("spec")
          .where("spec.name->>'en' = :name", { name: specName })
          .getOne();

        if (!specialization) {
          console.log(
            `⚠️  Specialization "${specName}" not found, skipping...`,
          );
          continue;
        }

        // Check if relationship already exists
        const existing = await allowedSpecRepository.findOne({
          where: {
            user: { id: user.id },
            specialization: { id: specialization.id },
          },
        });

        if (existing) {
          console.log(
            `⏭️  "${mapping.userEmail}" already allowed "${specName}", skipping...`,
          );
          continue;
        }

        // Create the allowed specialization
        const allowedSpec = allowedSpecRepository.create({
          user: user,
          specialization: specialization,
        });

        await allowedSpecRepository.save(allowedSpec);
        console.log(`✅ Allowed "${specName}" for ${mapping.userEmail}`);
      }
    }

    console.log("🎉 Allowed specialization seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding allowed specializations:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAllowedSpecializations()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
