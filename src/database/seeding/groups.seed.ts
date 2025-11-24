// src/database/seeding/groups.seed.ts
import { DataSource } from "typeorm";
import { Group } from "../../entities/index.js";

const baseGroups = [
  {
    name: { en: "Electrical Support Team", ar: "فريق دعم كهرباء" },
    descriptions: {
      en: "Handles electrical related tickets and issues",
      ar: "مسؤول عن التذاكر والمشكلات المتعلقة بالكهرباء",
    },
    color: "#FF9800",
  },
  {
    name: { en: "IT Helpdesk", ar: "مكتب مساعدة تكنولوجيا المعلومات" },
    descriptions: {
      en: "IT helpdesk and user support",
      ar: "خدمة الدعم الفني للمستخدمين",
    },
    color: "#2196F3",
  },
  {
    name: { en: "Network Team", ar: "فريق الشبكات" },
    descriptions: {
      en: "Responsible for network infrastructure",
      ar: "مسؤول عن البنية التحتية للشبكات",
    },
    color: "#4CAF50",
  },
];

export async function seedGroups(dataSource: DataSource) {
  const groupRepo = dataSource.getRepository(Group);

  for (const g of baseGroups) {
    const existing = await groupRepo
      .createQueryBuilder("grp")
      .where("grp.name->>'en' = :nameEn", { nameEn: g.name.en })
      .andWhere("grp.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.descriptions = g.descriptions;
      existing.color = g.color;
      await groupRepo.save(existing);
      console.log(`✅ [GroupsSeed] Updated group: ${g.name.en}`);
    } else {
      const newGroup = groupRepo.create({
        name: g.name,
        descriptions: g.descriptions,
        color: g.color,
      });
      await groupRepo.save(newGroup);
      console.log(`✅ [GroupsSeed] Inserted group: ${g.name.en}`);
    }
  }
}
