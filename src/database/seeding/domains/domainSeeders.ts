// src/seeds/domainSeeder.ts

import { PostgresDataSource } from "../../postgres-data-source.js";
import { University } from "../../../entities/University.js";
import { Domain } from "../../../entities/Domain.js";

interface DomainData {
  universityName: string; // English name
  domains: {
    name: { en: string; ar: string };
    description?: { en?: string; ar?: string };
  }[];
}

const domainsData: DomainData[] = [
  {
    universityName: "Cairo University",
    domains: [
      {
        name: { en: "Faculty of Engineering", ar: "كلية الهندسة" },
        description: {
          en: "Engineering and technology programs",
          ar: "برامج الهندسة والتكنولوجيا",
        },
      },
      {
        name: { en: "Faculty of Science", ar: "كلية العلوم" },
        description: {
          en: "Natural and applied sciences",
          ar: "العلوم الطبيعية والتطبيقية",
        },
      },
      {
        name: {
          en: "Faculty of Computers and AI",
          ar: "كلية الحاسبات والذكاء الاصطناعي",
        },
        description: {
          en: "Computer science and artificial intelligence",
          ar: "علوم الحاسب والذكاء الاصطناعي",
        },
      },
      {
        name: { en: "Faculty of Medicine", ar: "كلية الطب" },
        description: {
          en: "Medical education and research",
          ar: "التعليم والبحث الطبي",
        },
      },
    ],
  },
  {
    universityName: "Ain Shams University",
    domains: [
      {
        name: { en: "Faculty of Engineering", ar: "كلية الهندسة" },
        description: {
          en: "Engineering disciplines and research",
          ar: "التخصصات الهندسية والبحث",
        },
      },
      {
        name: { en: "Faculty of Computer Science", ar: "كلية علوم الحاسب" },
        description: {
          en: "Computer science and information technology",
          ar: "علوم الحاسب وتكنولوجيا المعلومات",
        },
      },
      {
        name: { en: "Faculty of Business", ar: "كلية التجارة" },
        description: {
          en: "Business administration and economics",
          ar: "إدارة الأعمال والاقتصاد",
        },
      },
    ],
  },
  {
    universityName: "Alexandria University",
    domains: [
      {
        name: { en: "Faculty of Engineering", ar: "كلية الهندسة" },
        description: {
          en: "Engineering and technological sciences",
          ar: "الهندسة والعلوم التكنولوجية",
        },
      },
      {
        name: { en: "Faculty of Science", ar: "كلية العلوم" },
        description: {
          en: "Mathematics, physics, chemistry, and biology",
          ar: "الرياضيات والفيزياء والكيمياء والأحياء",
        },
      },
    ],
  },
  {
    universityName: "American University in Cairo",
    domains: [
      {
        name: {
          en: "School of Sciences and Engineering",
          ar: "كلية العلوم والهندسة",
        },
        description: {
          en: "STEM education and research",
          ar: "التعليم والبحث في العلوم والتكنولوجيا والهندسة والرياضيات",
        },
      },
      {
        name: { en: "School of Business", ar: "كلية إدارة الأعمال" },
        description: {
          en: "Business administration and management",
          ar: "إدارة الأعمال والإدارة",
        },
      },
    ],
  },
];

export async function seedDomains() {
  try {
    const domainRepository = PostgresDataSource.getRepository(Domain);
    const universityRepository = PostgresDataSource.getRepository(University);

    console.log("🌱 Starting domain seeding...");

    for (const uniData of domainsData) {
      // Find the university
      const university = await universityRepository
        .createQueryBuilder("uni")
        .where("uni.name->>'en' = :name", { name: uniData.universityName })
        .getOne();

      if (!university) {
        console.log(
          `⚠️  University "${uniData.universityName}" not found, skipping domains...`
        );
        continue;
      }

      // Create domains for this university
      for (const domainData of uniData.domains) {
        // Check if domain already exists
        const existing = await domainRepository
          .createQueryBuilder("domain")
          .where("domain.name->>'en' = :name", { name: domainData.name.en })
          .andWhere("domain.universityId = :uniId", { uniId: university.id })
          .getOne();

        if (existing) {
          console.log(
            `⏭️  Domain "${domainData.name.en}" at "${uniData.universityName}" already exists, skipping...`
          );
          continue;
        }

        const domain = domainRepository.create({
          ...domainData,
          university,
        });

        await domainRepository.save(domain);
        console.log(
          `✅ Created domain: ${domainData.name.en} at ${uniData.universityName}`
        );
      }
    }

    console.log("🎉 Domain seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding domains:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDomains()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
