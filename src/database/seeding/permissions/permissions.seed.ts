import { DataSource } from "typeorm";
import { Permission } from "../../../entities/index.js";

type PermissionSeed = {
  key: string;
  name: { en: string; ar: string };
};

const permission = (key: string, en: string, ar: string): PermissionSeed => ({
  key,
  name: { en, ar },
});

const crud = (resource: string, labelEn: string, labelAr: string) => [
  permission(`${resource}.view`, `View ${labelEn}`, `عرض ${labelAr}`),
  permission(`${resource}.create`, `Create ${labelEn}`, `إنشاء ${labelAr}`),
  permission(`${resource}.edit`, `Edit ${labelEn}`, `تعديل ${labelAr}`),
  permission(`${resource}.delete`, `Delete ${labelEn}`, `حذف ${labelAr}`),
];

export const permissionsSeedData: PermissionSeed[] = [
  permission("dashboard.view", "View Dashboard", "عرض لوحة المعلومات"),
  permission("reports.view", "View Reports", "عرض التقارير"),
  permission("reports.export", "Export Reports", "تصدير التقارير"),

  permission("profile.view", "View Profile", "عرض الملف الشخصي"),
  permission("profile.edit", "Edit Profile", "تعديل الملف الشخصي"),

  ...crud("tickets", "Tickets", "التذاكر"),
  permission("tickets.assign", "Assign Tickets", "إسناد التذاكر"),
  permission("tickets.status", "Change Ticket Status", "تغيير حالة التذاكر"),
  permission("tickets.comment", "Comment on Tickets", "التعليق على التذاكر"),
  permission("tickets.media", "Manage Ticket Media", "إدارة مرفقات التذاكر"),
  permission("tickets.review", "Review Tickets", "تقييم التذاكر"),
  permission("tickets.final_report", "Manage Final Reports", "إدارة التقارير النهائية"),

  permission("identities.dashboard.view", "View Identities Dashboard", "عرض لوحة الهويات"),
  ...crud("users", "Users", "المستخدمين"),
  ...crud("groups", "Groups", "المجموعات"),

  permission("settings.view", "View Settings", "عرض الإعدادات"),
  permission("settings.edit", "Edit Settings", "تعديل الإعدادات"),
  permission("settings.system_info.view", "View System Info", "عرض معلومات النظام"),
  permission("settings.system_info.edit", "Edit System Info", "تعديل معلومات النظام"),
  ...crud("universities", "Universities", "الجامعات"),
  ...crud("domains", "Domains", "الكليات والإدارات"),
  ...crud("departments", "Departments", "الأقسام"),
  ...crud("specializations", "Specializations", "التخصصات"),
  ...crud("problems", "Problems", "المشكلات"),
  ...crud("trusted_devices", "Trusted Devices", "الأجهزة الموثوقة"),
  ...crud("permissions", "Permissions", "الصلاحيات"),
  permission("permission_profiles.view", "View Permission Profiles", "عرض ملفات الصلاحيات"),
  permission("permission_profiles.create", "Create Permission Profiles", "إنشاء ملفات الصلاحيات"),
  permission("permission_profiles.edit", "Edit Permission Profiles", "تعديل ملفات الصلاحيات"),
  permission("permission_profiles.delete", "Delete Permission Profiles", "حذف ملفات الصلاحيات"),
  permission("site_settings.view", "View Site Settings", "عرض إعدادات الموقع"),
  permission("site_settings.edit", "Edit Site Settings", "تعديل إعدادات الموقع"),
  ...crud("sla", "SLA Rules", "قواعد مستوى الخدمة"),
  permission("recycle_bin.view", "View Recycle Bin", "عرض سلة المحذوفات"),
  permission("recycle_bin.restore", "Restore Deleted Records", "استعادة السجلات المحذوفة"),
  permission("audit_logs.view", "View Audit Logs", "عرض سجلات التدقيق"),

  ...crud("knowledge_base", "Knowledge Base", "قاعدة المعرفة"),
  permission("knowledge_generator.view", "View Knowledge Generator", "عرض مولد المعرفة"),
  permission("knowledge_generator.create", "Create Generated Knowledge", "إنشاء معرفة مولدة"),
  permission("knowledge_generator.edit", "Edit Generated Knowledge", "تعديل المعرفة المولدة"),

  permission("chat.view", "View Chat", "عرض المحادثات"),
  permission("chat.create", "Create Chat Messages", "إنشاء رسائل المحادثة"),

  ...crud("custom_forms", "Custom Forms", "النماذج المخصصة"),
  permission("custom_forms.share", "Share Custom Forms", "مشاركة النماذج المخصصة"),
  permission("custom_forms.respond", "Respond to Custom Forms", "الإجابة على النماذج المخصصة"),
  permission("custom_forms.export", "Export Custom Form Responses", "تصدير إجابات النماذج المخصصة"),
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
