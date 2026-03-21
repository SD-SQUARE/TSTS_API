// src/seeds/permission-profiles.seed.ts

import { DataSource } from "typeorm";
import { PermissionProfile } from "../../../entities/PermissionProfile.js";
import { Permission } from "../../../entities/Permission.js";

type PermissionProfileSeed = {
  name: { en: string; ar: string };
  descriptions?: { en?: string; ar?: string };
  permissionKeys: string[];
};

const profilesSeedData: PermissionProfileSeed[] = [
  {
    name: { en: "Super Admin", ar: "مدير النظام" },
    descriptions: {
      en: "Full access to all system features",
      ar: "صلاحيات كاملة على كل مكونات النظام",
    },
    permissionKeys: [
      "users.view",
      "users.create",
      "users.edit",
      "users.delete",
      "domains.manage",
      "departments.manage",
    ],
  },
  {
    name: { en: "Admin", ar: "مسؤول" },
    descriptions: {
      en: "Manage users and structure",
      ar: "إدارة المستخدمين والهيكل التنظيمي",
    },
    permissionKeys: [
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
    permissionKeys: ["users.view"],
  },
];

export async function seedPermissionProfiles(dataSource: DataSource) {
  const permissionRepo = dataSource.getRepository(Permission);
  const profileRepo = dataSource.getRepository(PermissionProfile);

  /* تحميل كل permissions مرة واحدة */
  const allPermissions = await permissionRepo.find();

  /* تحويلها إلى Map للبحث السريع */
  const permissionMap = new Map<string, Permission>();

  allPermissions.forEach((perm) => {
    permissionMap.set(perm.key, perm);
  });

  for (const profile of profilesSeedData) {

    const permissions: Permission[] = [];

    for (const key of profile.permissionKeys) {
      const perm = permissionMap.get(key);

      if (!perm) {
        console.warn(
          `⚠️ Missing permission "${key}" for profile "${profile.name.en}"`
        );
        continue;
      }

      permissions.push(perm);
    }

    const existing = await profileRepo
      .createQueryBuilder("p")
      .where("p.name->>'en' = :name", { name: profile.name.en })
      .andWhere("p.deletedAt IS NULL")
      .getOne();

    if (existing) {

      existing.name = profile.name;
      existing.descriptions = profile.descriptions;
      existing.permissions = permissions;

      await profileRepo.save(existing);

      console.log(`✅ Updated PermissionProfile: ${profile.name.en}`);

    } else {

      const newProfile = profileRepo.create({
        name: profile.name,
        descriptions: profile.descriptions,
        permissions,
      });

      await profileRepo.save(newProfile);

      console.log(`✅ Inserted PermissionProfile: ${profile.name.en}`);
    }
  }
}