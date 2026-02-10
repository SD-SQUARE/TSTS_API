import { DataSource } from "typeorm";
import { Specialization } from "../../../entities/index.js";

const specializationsSeedData: Array<{
  name: { en: string; ar: string };
  description?: { en?: string; ar?: string };
}> = [
  {
    name: { en: "Maintenance and decommissioning", ar: "الصيانة والتكهين" },
    description: {
      en: "Providing ongoing system maintenance and safely decommissioning outdated or unused IT systems and infrastructure.",
      ar: "تقديم أعمال الصيانة المستمرة للأنظمة، وتنفيذ عمليات التكهين الآمن للأنظمة والبنية التحتية التقنية القديمة أو غير المستخدمة.",
    },
  },
  {
    name: { en: "Technical support", ar: "الدعم الفني" },
    description: {
      en: "Assisting users by troubleshooting technical issues, resolving system problems, and ensuring smooth operation of IT services.",
      ar: "مساندة المستخدمين من خلال تشخيص المشكلات التقنية وحل أعطال الأنظمة وضمان استمرارية عمل خدمات تقنية المعلومات.",
    },
  },
  {
    name: {
      en: "Enterprise Resource Planning support",
      ar: "دعم وتشغيل أنظمة تخطيط موارد المؤسسة",
    },
    description: {
      en: "Supporting ERP systems by managing, maintaining, and resolving issues related to integrated business applications.",
      ar: "دعم أنظمة تخطيط موارد المؤسسة من خلال إدارتها وصيانتها ومعالجة المشكلات المتعلقة بتكامل تطبيقات الأعمال.",
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
