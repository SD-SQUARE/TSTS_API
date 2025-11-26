// src/seeds/groupSeeder.ts

import { Group } from "../../../entities/Group.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

const groupsData = [
  {
    name: { en: "Network Support Team", ar: "فريق دعم الشبكات" },
    descriptions: {
      en: "Handles all network-related issues and maintenance",
      ar: "يتعامل مع جميع المشاكل المتعلقة بالشبكات والصيانة",
    },
    color: "#3B82F6", // Blue
  },
  {
    name: { en: "Hardware Team", ar: "فريق الأجهزة" },
    descriptions: {
      en: "Responsible for hardware repairs and maintenance",
      ar: "مسؤول عن إصلاح الأجهزة والصيانة",
    },
    color: "#EF4444", // Red
  },
  {
    name: { en: "Software Support Team", ar: "فريق دعم البرمجيات" },
    descriptions: {
      en: "Provides software installation and troubleshooting",
      ar: "يوفر تثبيت البرامج وحل المشكلات",
    },
    color: "#10B981", // Green
  },
  {
    name: { en: "Security Team", ar: "فريق الأمن" },
    descriptions: {
      en: "Manages security infrastructure and protocols",
      ar: "يدير البنية التحتية الأمنية والبروتوكولات",
    },
    color: "#F59E0B", // Amber
  },
  {
    name: { en: "System Administration Team", ar: "فريق إدارة الأنظمة" },
    descriptions: {
      en: "Oversees servers and system operations",
      ar: "يشرف على الخوادم وعمليات النظام",
    },
    color: "#8B5CF6", // Purple
  },
  {
    name: { en: "AV Support Team", ar: "فريق دعم الصوت والصورة" },
    descriptions: {
      en: "Handles audio/visual equipment and events",
      ar: "يتعامل مع معدات الصوت والصورة والفعاليات",
    },
    color: "#EC4899", // Pink
  },
  {
    name: { en: "General Support Team", ar: "فريق الدعم العام" },
    descriptions: {
      en: "Handles miscellaneous IT support requests",
      ar: "يتعامل مع طلبات الدعم التقني المتنوعة",
    },
    color: "#6B7280", // Gray
  },
];

export async function seedGroups() {
  try {
    const groupRepository = PostgresDataSource.getRepository(Group);

    console.log("🌱 Starting group seeding...");

    for (const groupData of groupsData) {
      // Check if group already exists
      const existing = await groupRepository
        .createQueryBuilder("grp")
        .where("grp.name->>'en' = :name", { name: groupData.name.en })
        .getOne();

      if (existing) {
        console.log(
          `⏭️  Group "${groupData.name.en}" already exists, skipping...`
        );
        continue;
      }

      const group = groupRepository.create(groupData);
      await groupRepository.save(group);

      console.log(`✅ Created group: ${groupData.name.en}`);
    }

    console.log("🎉 Group seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding groups:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedGroups()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
