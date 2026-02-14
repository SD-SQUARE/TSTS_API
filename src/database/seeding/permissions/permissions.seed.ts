import { DataSource } from "typeorm";
import { Permission } from "../../../entities/index.js";

type PermissionSeed = {
  code: string;
  category?: string;
  error?: { en?: string; ar?: string };
  description?: { en?: string; ar?: string };
};

const permissionsSeedData: PermissionSeed[] = [
  // ─── User Management ──────────────────────────────────────────────
  {
    code: "users.view",
    category: "users",
    description: {
      en: "View users list and details",
      ar: "عرض قائمة المستخدمين وتفاصيلهم",
    },
  },
  {
    code: "users.create",
    category: "users",
    description: {
      en: "Create new users",
      ar: "إنشاء مستخدمين جدد",
    },
    error: {
      en: "You are not allowed to create users",
      ar: "غير مسموح لك بإنشاء مستخدمين",
    },
  },
  {
    code: "users.edit",
    category: "users",
    description: {
      en: "Edit existing users",
      ar: "تعديل بيانات المستخدمين",
    },
  },
  {
    code: "users.delete",
    category: "users",
    description: {
      en: "Soft delete users",
      ar: "حذف المستخدمين (حذف منطقي)",
    },
  },

  // ─── Domains & Departments ───────────────────────────────────────
  {
    code: "domains.manage",
    category: "domains",
    description: {
      en: "Manage domains (faculties / admin units)",
      ar: "إدارة الكليات / الإدارات",
    },
  },
  {
    code: "departments.manage",
    category: "departments",
    description: {
      en: "Manage departments",
      ar: "إدارة الأقسام",
    },
  },

  // ➕ Add more permissions as needed...
];

export async function seedPermissions(dataSource: DataSource) {
  const permissionRepo = dataSource.getRepository(Permission);

  for (const p of permissionsSeedData) {
    const existing = await permissionRepo
      .createQueryBuilder("perm")
      .where("perm.code = :code", { code: p.code })
      .andWhere("perm.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.category = p.category;
      existing.description = p.description;
      existing.error = p.error;
      await permissionRepo.save(existing);
      console.log(`✅ [Permission] Updated: ${p.code}`);
    } else {
      const newPerm = permissionRepo.create({
        code: p.code,
        category: p.category,
        description: p.description,
        error: p.error,
      });
      await permissionRepo.save(newPerm);
      console.log(`✅ [Permission] Inserted: ${p.code}`);
    }
  }
}
