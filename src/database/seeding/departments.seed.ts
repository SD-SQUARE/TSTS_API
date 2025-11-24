import { DataSource } from "typeorm";
import { Department, Domain } from "../../entities/index.js";

const departmentsSeedData: Array<{
  universityEn: string; // for safety, we resolve domain under a specific university
  domainEn: string;
  name: { en: string; ar: string };
  description?: { en?: string; ar?: string };
}> = [
  {
    universityEn: "Helwan University",
    domainEn: "Faculty of Engineering",
    name: { en: "Electrical Engineering", ar: "قسم الهندسة الكهربائية" },
    description: {
      en: "Electrical Engineering Department",
      ar: "قسم الهندسة الكهربائية",
    },
  },
  {
    universityEn: "Helwan University",
    domainEn: "Faculty of Engineering",
    name: { en: "Mechanical Engineering", ar: "قسم الهندسة الميكانيكية" },
    description: {
      en: "Mechanical Engineering Department",
      ar: "قسم الهندسة الميكانيكية",
    },
  },
  {
    universityEn: "Cairo University",
    domainEn: "Faculty of Engineering",
    name: { en: "Civil Engineering", ar: "قسم الهندسة المدنية" },
    description: {
      en: "Civil Engineering Department",
      ar: "قسم الهندسة المدنية",
    },
  },
  // ➕ add more departments as needed
];

export async function seedDepartments(dataSource: DataSource) {
  const domainRepo = dataSource.getRepository(Domain);
  const departmentRepo = dataSource.getRepository(Department);

  for (const dept of departmentsSeedData) {
    // Find domain under a specific university
    const parentDomain = await domainRepo
      .createQueryBuilder("d")
      .leftJoin("d.university", "u")
      .where("d.name->>'en' = :domainEn", { domainEn: dept.domainEn })
      .andWhere("u.name->>'en' = :universityEn", {
        universityEn: dept.universityEn,
      })
      .andWhere("d.deletedAt IS NULL")
      .getOne();

    if (!parentDomain) {
      console.warn(
        `⚠️ [Department] Parent Domain not found for department "${dept.name.en}" (domain: "${dept.domainEn}", university: "${dept.universityEn}")`
      );
      continue;
    }

    const existing = await departmentRepo
      .createQueryBuilder("dep")
      .leftJoin("dep.domain", "d")
      .leftJoin("d.university", "u")
      .where("dep.name->>'en' = :deptEn", { deptEn: dept.name.en })
      .andWhere("d.id = :domainId", { domainId: parentDomain.id })
      .andWhere("dep.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.description = dept.description;
      existing.domain = parentDomain;
      await departmentRepo.save(existing);
      console.log(
        `✅ [Department] Updated: ${dept.name.en} (Domain: ${dept.domainEn}, University: ${dept.universityEn})`
      );
    } else {
      const newDept = departmentRepo.create({
        name: dept.name,
        description: dept.description,
        domain: parentDomain,
      });

      await departmentRepo.save(newDept);
      console.log(
        `✅ [Department] Inserted: ${dept.name.en} (Domain: ${dept.domainEn}, University: ${dept.universityEn})`
      );
    }
  }
}
