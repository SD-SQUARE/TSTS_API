import { DataSource } from "typeorm";
import { Domain, University } from "../../entities/index.js";

const domainsSeedData: Array<{
  universityEn: string; // parent university (English name)
  name: { en: string; ar: string };
  description?: { en?: string; ar?: string };
}> = [
  {
    universityEn: "Helwan University",
    name: { en: "Faculty of Engineering", ar: "كلية الهندسة" },
    description: {
      en: "Engineering faculty of Helwan University",
      ar: "كلية الهندسة بجامعة حلوان",
    },
  },
  {
    universityEn: "Helwan University",
    name: { en: "Faculty of Commerce", ar: "كلية التجارة" },
    description: {
      en: "Commerce faculty of Helwan University",
      ar: "كلية التجارة بجامعة حلوان",
    },
  },
  {
    universityEn: "Cairo University",
    name: { en: "Faculty of Engineering", ar: "كلية الهندسة" },
    description: {
      en: "Engineering faculty of Cairo University",
      ar: "كلية الهندسة بجامعة القاهرة",
    },
  },
  // ➕ add more as you like
];

export async function seedDomains(dataSource: DataSource) {
  const universityRepo = dataSource.getRepository(University);
  const domainRepo = dataSource.getRepository(Domain);

  for (const dom of domainsSeedData) {
    const parentUni = await universityRepo
      .createQueryBuilder("u")
      .where("u.name->>'en' = :universityEn", {
        universityEn: dom.universityEn,
      })
      .andWhere("u.deletedAt IS NULL")
      .getOne();

    if (!parentUni) {
      console.warn(
        `⚠️ [Domain] Parent University not found for domain "${dom.name.en}" (university: "${dom.universityEn}")`
      );
      continue;
    }

    const existing = await domainRepo
      .createQueryBuilder("d")
      .leftJoin("d.university", "u")
      .where("d.name->>'en' = :domainEn", { domainEn: dom.name.en })
      .andWhere("u.id = :uniId", { uniId: parentUni.id })
      .andWhere("d.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.description = dom.description;
      existing.university = parentUni;
      await domainRepo.save(existing);
      console.log(
        `✅ [Domain] Updated: ${dom.name.en} (University: ${dom.universityEn})`
      );
    } else {
      const newDomain = domainRepo.create({
        name: dom.name,
        description: dom.description,
        university: parentUni,
      });

      await domainRepo.save(newDomain);
      console.log(
        `✅ [Domain] Inserted: ${dom.name.en} (University: ${dom.universityEn})`
      );
    }
  }
}
