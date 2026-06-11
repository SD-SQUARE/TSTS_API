import { DataSource } from "typeorm";
import { University } from "../../../entities/index.js";

const universitiesSeedData: Array<{
  name: { en: string; ar: string };
  description?: { en?: string; ar?: string };
}> = [
  {
    name: { en: "Capital University", ar: "جامعة العاصمة" },
    description: { en: "Capital University", ar: "جامعة العاصمة" },
  },
  {
    name: { en: "Helwan National University", ar: "جامعة حلوان الاهلية" },
    description: {
      en: "Helwan National University",
      ar: "جامعة حلوان الاهلية",
    },
  },
  {
    name: {
      en: "Helwan Technological University",
      ar: "جامعة حلوان التكنولوجية",
    },
    description: {
      en: "Helwan Technological University",
      ar: "جامعة حلوان التكنولوجية",
    },
  },
];

export async function seedUniversities(dataSource: DataSource) {
  const universityRepo = dataSource.getRepository(University);

  for (const uni of universitiesSeedData) {
    // match by English name inside jsonb
    const existing = await universityRepo
      .createQueryBuilder("university")
      .where("university.name->>'en' = :nameEn", { nameEn: uni.name.en })
      .andWhere("university.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.description = uni.description;
      await universityRepo.save(existing);
      console.log(`✅ [University] Updated: ${uni.name.en}`);
    } else {
      const newUni = universityRepo.create({
        name: uni.name,
        description: uni.description,
      });
      await universityRepo.save(newUni);
      console.log(`✅ [University] Inserted: ${uni.name.en}`);
    }
  }
}
