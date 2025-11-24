// src/seeds/permission-profiles.seed.ts
import { DataSource } from "typeorm";
import { PermissionProfile } from "../../entities/PermissionProfile.js";
import { Permission } from "../../entities/index.js";

type PermissionProfileSeed = {
  name: { en: string; ar: string };
  descriptions?: { en?: string; ar?: string };
  permissionCodes: string[]; // map to Permission.code
};

const profilesSeedData: PermissionProfileSeed[] = [
  {
    name: { en: "Super Admin", ar: "مدير النظام" },
    descriptions: {
      en: "Full access to all system features",
      ar: "صلاحيات كاملة على كل مكونات النظام",
    },
    permissionCodes: [
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "domains.manage",
      "departments.manage",
      // add all permissions here for super admin...
    ],
  },
  {
    name: { en: "Admin", ar: "مسؤول" },
    descriptions: {
      en: "Manage users and structure",
      ar: "إدارة المستخدمين والهيكل التنظيمي",
    },
    permissionCodes: [
      "users.view",
      "users.create",
      "users.edit",
      "domains.manage",
      "departments.manage",
    ],
  },
  {
    name: { en: "Viewer", ar: "مشاهد" },
    descriptions: {
      en: "Can only view users",
      ar: "يمكنه عرض المستخدمين فقط",
    },
    permissionCodes: ["users.view"],
  },
  // ➕ Add more profiles as needed (Requester, Technician, etc.)
];

export async function seedPermissionProfiles(dataSource: DataSource) {
  const permissionRepo = dataSource.getRepository(Permission);
  const profileRepo = dataSource.getRepository(PermissionProfile);

  for (const profile of profilesSeedData) {
    // Resolve codes → ids
    const permissions = await permissionRepo
      .createQueryBuilder("perm")
      .where("perm.code IN (:...codes)", { codes: profile.permissionCodes })
      .andWhere("perm.deletedAt IS NULL")
      .getMany();

    const foundCodes = new Set(permissions.map((p) => p.code));
    const missingCodes = profile.permissionCodes.filter(
      (code) => !foundCodes.has(code)
    );

    if (missingCodes.length > 0) {
      console.warn(
        `⚠️ [PermissionProfile] Missing permissions for profile "${profile.name.en}":`,
        missingCodes
      );
    }

    const permissionIds = permissions.map((p) => p.id);

    // Find profile by English name
    const existing = await profileRepo
      .createQueryBuilder("prof")
      .where("prof.name->>'en' = :nameEn", { nameEn: profile.name.en })
      .andWhere("prof.deletedAt IS NULL")
      .getOne();

    if (existing) {
      existing.name = profile.name;
      existing.descriptions = profile.descriptions;
      existing.permissionIds = permissionIds;
      await profileRepo.save(existing);
      console.log(`✅ [PermissionProfile] Updated: ${profile.name.en}`);
    } else {
      const newProfile = profileRepo.create({
        name: profile.name,
        descriptions: profile.descriptions,
        permissionIds,
      });
      await profileRepo.save(newProfile);
      console.log(`✅ [PermissionProfile] Inserted: ${profile.name.en}`);
    }
  }
}
