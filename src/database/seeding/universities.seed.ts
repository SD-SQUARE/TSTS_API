import { DataSource } from "typeorm";
import { University } from "../../entities/index.js";

const universitiesSeedData: Array<{
  name: { en: string; ar: string };
  description?: { en?: string; ar?: string };
}> = [
  {
    name: { en: "Helwan University", ar: "جامعة حلوان" },
    description: {
      en: "Public university in Egypt",
      ar: "جامعة حكومية في مصر",
    },
  },
  {
    name: { en: "Cairo University", ar: "جامعة القاهرة" },
    description: {
      en: "One of the oldest universities in Egypt",
      ar: "واحدة من أقدم الجامعات في مصر",
    },
  },
  // ➕ add more if needed
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
