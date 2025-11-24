import { DataSource } from "typeorm";
import { Specialization } from "../../entities/index.js";

const specializationsSeedData: Array<{
  name: { en: string; ar: string };
  description?: { en?: string; ar?: string };
}> = [
  {
    name: { en: "Power Systems", ar: "قدرة كهربية" },
    description: {
      en: "Power systems engineering specialization",
      ar: "تخصص هندسة القوى الكهربية",
    },
  },
  {
    name: { en: "Electronics and Communications", ar: "إلكترونيات واتصالات" },
    description: {
      en: "Electronics and communication engineering",
      ar: "هندسة الإلكترونيات والاتصالات",
    },
  },
  {
    name: { en: "Mechanical Design", ar: "تصميم ميكانيكي" },
    description: {
      en: "Mechanical design and production",
      ar: "تصميم وإنتاج ميكانيكي",
    },
  },
];

export async function seedSpecializations(dataSource: DataSource) {
  const specRepo = dataSource.getRepository(Specialization);

  for (const spec of specializationsSeedData) {
    const existing = await specRepo
      .createQueryBuilder("s")
      .where("s.name->>'en' = :nameEn", { nameEn: spec.name.en })
      .andWhere("s.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.description = spec.description;
      await specRepo.save(existing);
      console.log(`✅ [Specialization] Updated: ${spec.name.en}`);
    } else {
      const newSpec = specRepo.create({
        name: spec.name,
        description: spec.description,
      });
      await specRepo.save(newSpec);
      console.log(`✅ [Specialization] Inserted: ${spec.name.en}`);
    }
  }
}
