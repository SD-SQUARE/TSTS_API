// src/seeds/specializationSeeder.ts

import { Specialization } from "../../../entities/Specialization.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

const specializationsData = [
  {
    name: { en: "Network Administration", ar: "إدارة الشبكات" },
    description: {
      en: "Network setup, maintenance, and troubleshooting",
      ar: "إعداد الشبكات والصيانة وحل المشكلات",
    },
  },
  {
    name: { en: "Hardware Repair", ar: "إصلاح الأجهزة" },
    description: {
      en: "Computer and hardware maintenance and repair",
      ar: "صيانة وإصلاح الحواسيب والأجهزة",
    },
  },
  {
    name: { en: "Software Support", ar: "دعم البرمجيات" },
    description: {
      en: "Software installation, updates, and troubleshooting",
      ar: "تثبيت البرامج والتحديثات وحل المشكلات",
    },
  },
  {
    name: { en: "Database Management", ar: "إدارة قواعد البيانات" },
    description: {
      en: "Database administration and optimization",
      ar: "إدارة وتحسين قواعد البيانات",
    },
  },
  {
    name: { en: "Security & Firewall", ar: "الأمن وجدران الحماية" },
    description: {
      en: "Network security and firewall configuration",
      ar: "أمن الشبكات وتكوين جدران الحماية",
    },
  },
  {
    name: { en: "Web Development", ar: "تطوير الويب" },
    description: {
      en: "Web application development and maintenance",
      ar: "تطوير وصيانة تطبيقات الويب",
    },
  },
  {
    name: { en: "System Administration", ar: "إدارة الأنظمة" },
    description: {
      en: "Server and system administration",
      ar: "إدارة الخوادم والأنظمة",
    },
  },
  {
    name: { en: "Audio/Visual Support", ar: "دعم الصوت والصورة" },
    description: {
      en: "AV equipment setup and support",
      ar: "إعداد ودعم معدات الصوت والصورة",
    },
  },
  {
    name: { en: "Printer & Scanner Support", ar: "دعم الطابعات والماسحات" },
    description: {
      en: "Printer and scanner maintenance",
      ar: "صيانة الطابعات والماسحات الضوئية",
    },
  },
  {
    name: { en: "Telecommunications", ar: "الاتصالات" },
    description: {
      en: "Phone systems and communication infrastructure",
      ar: "أنظمة الهاتف والبنية التحتية للاتصالات",
    },
  },
];

export async function seedSpecializations() {
  try {
    const specializationRepository =
      PostgresDataSource.getRepository(Specialization);

    console.log("🌱 Starting specialization seeding...");

    for (const specData of specializationsData) {
      // Check if specialization already exists
      const existing = await specializationRepository
        .createQueryBuilder("spec")
        .where("spec.name->>'en' = :name", { name: specData.name.en })
        .getOne();

      if (existing) {
        console.log(
          `⏭️  Specialization "${specData.name.en}" already exists, skipping...`
        );
        continue;
      }

      const specialization = specializationRepository.create(specData);
      await specializationRepository.save(specialization);

      console.log(`✅ Created specialization: ${specData.name.en}`);
    }

    console.log("🎉 Specialization seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding specializations:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSpecializations()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
