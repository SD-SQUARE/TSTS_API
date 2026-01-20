// src/seeds/departmentSeeder.ts

import { Department } from "../../../entities/Department.js";
import { PostgresDataSource } from "../../postgres-data-source.js";
import { University } from "../../../entities/University.js";
import { Domain } from "../../../entities/Domain.js";

interface DepartmentData {
  universityName: string;
  domainName: string;
  departments: {
    name: { en: string; ar: string };
    description?: { en?: string; ar?: string };
  }[];
}

const departmentsData: DepartmentData[] = [
  {
    universityName: "Cairo University",
    domainName: "Faculty of Engineering",
    departments: [
      {
        name: { en: "Computer Engineering", ar: "هندسة الحاسبات" },
        description: {
          en: "Hardware and software systems design",
          ar: "تصميم أنظمة الأجهزة والبرمجيات",
        },
      },
      {
        name: { en: "Communications Engineering", ar: "هندسة الاتصالات" },
        description: {
          en: "Telecommunications and networking",
          ar: "الاتصالات والشبكات",
        },
      },
      {
        name: { en: "Electrical Engineering", ar: "الهندسة الكهربائية" },
        description: {
          en: "Electrical systems and power",
          ar: "الأنظمة الكهربائية والطاقة",
        },
      },
      {
        name: { en: "Mechanical Engineering", ar: "الهندسة الميكانيكية" },
        description: {
          en: "Mechanical systems and manufacturing",
          ar: "الأنظمة الميكانيكية والتصنيع",
        },
      },
    ],
  },
  {
    universityName: "Cairo University",
    domainName: "Faculty of Computers and AI",
    departments: [
      {
        name: { en: "Computer Science", ar: "علوم الحاسب" },
        description: {
          en: "Algorithms, programming, and theoretical computer science",
          ar: "الخوارزميات والبرمجة وعلوم الحاسب النظرية",
        },
      },
      {
        name: { en: "Information Systems", ar: "نظم المعلومات" },
        description: {
          en: "Business and organizational information systems",
          ar: "نظم المعلومات التجارية والتنظيمية",
        },
      },
      {
        name: { en: "Artificial Intelligence", ar: "الذكاء الاصطناعي" },
        description: {
          en: "Machine learning and intelligent systems",
          ar: "التعلم الآلي والأنظمة الذكية",
        },
      },
      {
        name: { en: "Information Technology", ar: "تكنولوجيا المعلومات" },
        description: {
          en: "IT infrastructure and system administration",
          ar: "البنية التحتية لتكنولوجيا المعلومات وإدارة الأنظمة",
        },
      },
    ],
  },
  {
    universityName: "Ain Shams University",
    domainName: "Faculty of Computer Science",
    departments: [
      {
        name: { en: "Software Engineering", ar: "هندسة البرمجيات" },
        description: {
          en: "Software development and engineering practices",
          ar: "تطوير البرمجيات والممارسات الهندسية",
        },
      },
      {
        name: { en: "Network Engineering", ar: "هندسة الشبكات" },
        description: {
          en: "Computer networks and security",
          ar: "شبكات الحاسب والأمن",
        },
      },
      {
        name: { en: "Data Science", ar: "علم البيانات" },
        description: {
          en: "Big data analytics and data mining",
          ar: "تحليل البيانات الضخمة واستخراج البيانات",
        },
      },
    ],
  },
  {
    universityName: "American University in Cairo",
    domainName: "School of Sciences and Engineering",
    departments: [
      {
        name: {
          en: "Computer Science and Engineering",
          ar: "علوم وهندسة الحاسب",
        },
        description: {
          en: "Comprehensive computer science and engineering program",
          ar: "برنامج شامل لعلوم وهندسة الحاسب",
        },
      },
      {
        name: { en: "Electronics Engineering", ar: "هندسة الإلكترونيات" },
        description: {
          en: "Electronic systems and embedded systems",
          ar: "الأنظمة الإلكترونية والأنظمة المدمجة",
        },
      },
    ],
  },
];

export async function seedDepartments() {
  try {
    const departmentRepository = PostgresDataSource.getRepository(Department);
    const domainRepository = PostgresDataSource.getRepository(Domain);
    const universityRepository = PostgresDataSource.getRepository(University);

    console.log("🌱 Starting department seeding...");

    for (const data of departmentsData) {
      // Find the university first
      const university = await universityRepository
        .createQueryBuilder("uni")
        .where("uni.name->>'en' = :name", { name: data.universityName })
        .getOne();

      if (!university) {
        console.log(
          `⚠️  University "${data.universityName}" not found, skipping...`
        );
        continue;
      }

      // Find the domain
      const domain = await domainRepository
        .createQueryBuilder("domain")
        .where("domain.name->>'en' = :name", { name: data.domainName })
        .andWhere("domain.universityId = :uniId", { uniId: university.id })
        .getOne();

      if (!domain) {
        console.log(
          `⚠️  Domain "${data.domainName}" at "${data.universityName}" not found, skipping...`
        );
        continue;
      }

      // Create departments
      for (const deptData of data.departments) {
        // Check if department already exists
        const existing = await departmentRepository
          .createQueryBuilder("dept")
          .where("dept.name->>'en' = :name", { name: deptData.name.en })
          .andWhere("dept.domainId = :domainId", {
            domainId: (domain as any).id,
          })
          .getOne();

        if (existing) {
          console.log(
            `⏭️  Department "${deptData.name.en}" already exists, skipping...`
          );
          continue;
        }

        const department = departmentRepository.create({
          ...deptData,
          domain: domain,
        });

        await departmentRepository.save(department);
        console.log(
          `✅ Created department: ${deptData.name.en} in ${data.domainName}`
        );
      }
    }

    console.log("🎉 Department seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding departments:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDepartments()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
