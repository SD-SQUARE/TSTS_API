import { DataSource } from "typeorm";
import { PermissionProfile } from "../../../entities/PermissionProfile.js";
import { Permission } from "../../../entities/Permission.js";

type PermissionProfileSeed = {
  name: { en: string; ar: string };
  descriptions?: { en?: string; ar?: string };
  permissionKeys: string[];
};

const ticketOperatorPermissions = [
  "dashboard.view",
  "profile.view",
  "profile.edit",
  "tickets.view",
  "tickets.edit",
  "tickets.assign",
  "tickets.status",
  "tickets.comment",
  "tickets.media",
  "tickets.review",
  "tickets.final_report",
  "knowledge_base.view",
  "knowledge_generator.view",
  "chat.view",
  "chat.create",
];

const structureViewPermissions = [
  "identities.dashboard.view",
  "users.view",
  "groups.view",
  "universities.view",
  "domains.view",
  "departments.view",
  "specializations.view",
  "problems.view",
  "sla.view",
  "permissions.view",
  "permission_profiles.view",
  "site_settings.view",
  "settings.view",
  "settings.system_info.view",
];

const profilesSeedData: PermissionProfileSeed[] = [
  {
    name: { en: "Super Admin", ar: "مدير النظام" },
    descriptions: {
      en: "Full access to every page, workflow, and administrative action.",
      ar: "صلاحيات كاملة لكل الصفحات والإجراءات الإدارية.",
    },
    permissionKeys: ["*"],
  },
  {
    name: { en: "Platform Admin", ar: "مسؤول المنصة" },
    descriptions: {
      en: "Manages identities, settings, permissions, tickets, knowledge, forms, and recovery operations.",
      ar: "يدير الهويات والإعدادات والصلاحيات والتذاكر والمعرفة والنماذج والاستعادة.",
    },
    permissionKeys: [
      ...structureViewPermissions,
      "profile.view",
      "profile.edit",
      "reports.view",
      "reports.export",
      "users.create",
      "users.edit",
      "users.delete",
      "groups.create",
      "groups.edit",
      "groups.delete",
      "universities.create",
      "universities.edit",
      "universities.delete",
      "domains.create",
      "domains.edit",
      "domains.delete",
      "departments.create",
      "departments.edit",
      "departments.delete",
      "specializations.create",
      "specializations.edit",
      "specializations.delete",
      "problems.create",
      "problems.edit",
      "problems.delete",
      "trusted_devices.view",
      "trusted_devices.create",
      "trusted_devices.edit",
      "trusted_devices.delete",
      "permissions.create",
      "permissions.edit",
      "permissions.delete",
      "permission_profiles.create",
      "permission_profiles.edit",
      "permission_profiles.delete",
      "site_settings.edit",
      "settings.edit",
      "settings.system_info.edit",
      "sla.create",
      "sla.edit",
      "sla.delete",
      "recycle_bin.view",
      "recycle_bin.restore",
      "audit_logs.view",
      "tickets.view",
      "tickets.create",
      "tickets.edit",
      "tickets.delete",
      "tickets.assign",
      "tickets.status",
      "tickets.comment",
      "tickets.media",
      "tickets.review",
      "tickets.final_report",
      "knowledge_base.view",
      "knowledge_base.create",
      "knowledge_base.edit",
      "knowledge_base.delete",
      "knowledge_generator.view",
      "knowledge_generator.create",
      "knowledge_generator.edit",
      "chat.view",
      "chat.create",
      "custom_forms.view",
      "custom_forms.create",
      "custom_forms.edit",
      "custom_forms.delete",
      "custom_forms.share",
      "custom_forms.respond",
      "custom_forms.export",
    ],
  },
  {
    name: { en: "Support Manager", ar: "مدير الدعم" },
    descriptions: {
      en: "Oversees support queues, SLA health, reports, knowledge content, and forms.",
      ar: "يتابع قوائم الدعم وحالة مستوى الخدمة والتقارير والمحتوى والنماذج.",
    },
    permissionKeys: [
      ...ticketOperatorPermissions,
      ...structureViewPermissions,
      "tickets.create",
      "reports.view",
      "reports.export",
      "knowledge_base.create",
      "knowledge_base.edit",
      "knowledge_base.delete",
      "knowledge_generator.create",
      "knowledge_generator.edit",
      "custom_forms.view",
      "custom_forms.create",
      "custom_forms.edit",
      "custom_forms.delete",
      "custom_forms.share",
      "custom_forms.respond",
      "custom_forms.export",
    ],
  },
  {
    name: { en: "Technician", ar: "فني" },
    descriptions: {
      en: "Works assigned tickets and contributes support knowledge.",
      ar: "يعالج التذاكر المسندة ويساهم في معرفة الدعم.",
    },
    permissionKeys: [
      ...ticketOperatorPermissions,
      "custom_forms.view",
      "custom_forms.create",
      "custom_forms.edit",
      "custom_forms.share",
      "custom_forms.respond",
      "custom_forms.export",
    ],
  },
  {
    name: { en: "Requester", ar: "مقدم طلب" },
    descriptions: {
      en: "Creates and follows own tickets and submits public form responses.",
      ar: "ينشئ ويتابع تذاكره ويرسل إجابات النماذج.",
    },
    permissionKeys: [
      "profile.view",
      "profile.edit",
      "tickets.view",
      "tickets.create",
      "tickets.edit",
      "tickets.comment",
      "tickets.media",
      "tickets.review",
      "knowledge_base.view",
      "custom_forms.respond",
    ],
  },
  {
    name: { en: "Auditor", ar: "مدقق" },
    descriptions: {
      en: "Read-only access for audits, reporting, structure, permissions, and ticket review.",
      ar: "وصول للقراءة فقط للتدقيق والتقارير والهيكل والصلاحيات ومراجعة التذاكر.",
    },
    permissionKeys: [
      ...structureViewPermissions,
      "profile.view",
      "reports.view",
      "reports.export",
      "audit_logs.view",
      "tickets.view",
      "knowledge_base.view",
      "custom_forms.view",
      "custom_forms.export",
      "recycle_bin.view",
    ],
  },
];

export async function seedPermissionProfiles(dataSource: DataSource) {
  const permissionRepo = dataSource.getRepository(Permission);
  const profileRepo = dataSource.getRepository(PermissionProfile);

  const allPermissions = await permissionRepo.find();
  const permissionMap = new Map<string, Permission>();

  allPermissions.forEach((perm) => {
    permissionMap.set(perm.key, perm);
  });

  for (const profile of profilesSeedData) {
    const permissions =
      profile.permissionKeys.includes("*")
        ? allPermissions
        : profile.permissionKeys
            .map((key) => {
              const perm = permissionMap.get(key);
              if (!perm) {
                console.warn(
                  `Missing permission "${key}" for profile "${profile.name.en}"`,
                );
              }
              return perm;
            })
            .filter(Boolean) as Permission[];

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

      console.log(`Updated PermissionProfile: ${profile.name.en}`);
    } else {
      const newProfile = profileRepo.create({
        name: profile.name,
        descriptions: profile.descriptions,
        permissions,
      });

      await profileRepo.save(newProfile);

      console.log(`Inserted PermissionProfile: ${profile.name.en}`);
    }
  }
}
