// src/seeds/universitySeeder.ts

import { University } from "../../../entities/University.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

const universitiesData = [
  {
    name: {
      en: "Cairo University",
      ar: "جامعة القاهرة",
    },
    description: {
      en: "The premier public university in Egypt, founded in 1908",
      ar: "الجامعة الحكومية الرائدة في مصر، تأسست عام 1908",
    },
  },
  {
    name: {
      en: "Ain Shams University",
      ar: "جامعة عين شمس",
    },
    description: {
      en: "One of the largest comprehensive universities in the Middle East",
      ar: "واحدة من أكبر الجامعات الشاملة في الشرق الأوسط",
    },
  },
  {
    name: {
      en: "Alexandria University",
      ar: "جامعة الإسكندرية",
    },
    description: {
      en: "Major public university in Alexandria, established in 1942",
      ar: "جامعة حكومية رئيسية في الإسكندرية، تأسست عام 1942",
    },
  },
  {
    name: {
      en: "Helwan University",
      ar: "جامعة حلوان",
    },
    description: {
      en: "Public university specializing in applied arts and engineering",
      ar: "جامعة حكومية متخصصة في الفنون التطبيقية والهندسة",
    },
  },
  {
    name: {
      en: "Mansoura University",
      ar: "جامعة المنصورة",
    },
    description: {
      en: "Leading university in the Nile Delta region",
      ar: "جامعة رائدة في منطقة دلتا النيل",
    },
  },
  {
    name: {
      en: "Assiut University",
      ar: "جامعة أسيوط",
    },
    description: {
      en: "The first university in Upper Egypt, founded in 1957",
      ar: "أول جامعة في صعيد مصر، تأسست عام 1957",
    },
  },
  {
    name: {
      en: "Zagazig University",
      ar: "جامعة الزقازيق",
    },
    description: {
      en: "Public university serving the Sharqia Governorate",
      ar: "جامعة حكومية تخدم محافظة الشرقية",
    },
  },
  {
    name: {
      en: "Tanta University",
      ar: "جامعة طنطا",
    },
    description: {
      en: "Public university in the heart of the Nile Delta",
      ar: "جامعة حكومية في قلب دلتا النيل",
    },
  },
  {
    name: {
      en: "American University in Cairo",
      ar: "الجامعة الأمريكية بالقاهرة",
    },
    description: {
      en: "Private English-language university founded in 1919",
      ar: "جامعة خاصة تدرس باللغة الإنجليزية تأسست عام 1919",
    },
  },
  {
    name: {
      en: "German University in Cairo",
      ar: "الجامعة الألمانية بالقاهرة",
    },
    description: {
      en: "Private university with German academic standards",
      ar: "جامعة خاصة بمعايير أكاديمية ألمانية",
    },
  },
];

export async function seedUniversities() {
  try {
    const universityRepository = PostgresDataSource.getRepository(University);

    console.log("🌱 Starting university seeding...");

    for (const uniData of universitiesData) {
      // Check if university already exists
      const existing = await universityRepository
        .createQueryBuilder("uni")
        .where("uni.name->>'en' = :name", { name: uniData.name.en })
        .getOne();

      if (existing) {
        console.log(
          `⏭️  University "${uniData.name.en}" already exists, skipping...`
        );
        continue;
      }

      const university = universityRepository.create(uniData);
      await universityRepository.save(university);

      console.log(`✅ Created university: ${uniData.name.en}`);
    }

    console.log("🎉 University seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding universities:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUniversities()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
