// src/database/seeding/groups.seed.ts
import { DataSource } from "typeorm";
import { Group } from "../../../entities/index.js";

const baseGroups = [
  {
    name: {
      en: "Maintenance and decommissioning Team",
      ar: "فريق الصيانة و التكهين",
    },
    descriptions: {
      en: "Provides ongoing system maintenance and safely decommissions outdated or unused IT systems and infrastructure.",
      ar: "تقديم أعمال الصيانة المستمرة للأنظمة، وتنفيذ عمليات التكهين الآمن للأنظمة والبنية التحتية التقنية القديمة أو غير المستخدمة.",
    },
    color: "#FF9800",
  },
  {
    name: {
      en: "Technical support Team",
      ar: "فريق الدعم الفني",
    },
    descriptions: {
      en: "Assists users by troubleshooting technical issues, resolving system problems, and ensuring smooth operation of IT services.",
      ar: "مساندة المستخدمين من خلال تشخيص المشكلات التقنية وحل أعطال الأنظمة وضمان استمرارية عمل خدمات تقنية المعلومات.",
    },
    color: "#2196F3",
  },
  {
    name: {
      en: "Enterprise Resource Planning support Team",
      ar: "فريق دعم وتشغيل أنظمة تخطيط موارد المؤسسة",
    },
    descriptions: {
      en: "Supports ERP systems by managing, maintaining, and resolving issues related to integrated business applications.",
      ar: "دعم أنظمة تخطيط موارد المؤسسة من خلال إدارتها وصيانتها ومعالجة المشكلات المتعلقة بتكامل تطبيقات الأعمال.",
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
