import { DataSource } from "typeorm";
import { Permission } from "../../../entities/index.js";

type PermissionSeed = {
  key: string;
  name?: { en?: string; ar?: string };
};

const permissionsSeedData: PermissionSeed[] = [
  {
    key: "users.view",
    name: {
      en: "View Users",
      ar: "عرض المستخدمين",
    },
  },
  {
    key: "users.create",
    name: {
      en: "Create Users",
      ar: "إنشاء مستخدمين",
    },
  },
  {
    key: "users.edit",
    name: {
      en: "Edit Users",
      ar: "تعديل المستخدمين",
    },
  },
  {
    key: "users.delete",
    name: {
      en: "Delete Users",
      ar: "حذف المستخدمين",
    },
  },
  {
    key: "domains.manage",
    name: {
      en: "Manage Domains",
      ar: "إدارة الكليات / الإدارات",
    },
  },
  {
    key: "departments.manage",
    name: {
      en: "Manage Departments",
      ar: "إدارة الأقسام",
    },
  },
];

export async function seedPermissions(dataSource: DataSource) {
  const permissionRepo = dataSource.getRepository(Permission);

  for (const p of permissionsSeedData) {
    const existing = await permissionRepo
      .createQueryBuilder("perm")
      .where("perm.key = :key", { key: p.key })
      .getOne();

    if (existing) {
      existing.name = p.name;

      await permissionRepo.save(existing);

      console.log(`✅ [Permission] Updated: ${p.key}`);
    } else {
      const newPerm = permissionRepo.create({
        key: p.key,
        name: p.name,
      });

      await permissionRepo.save(newPerm);

      console.log(`✅ [Permission] Inserted: ${p.key}`);
    }
  }
}