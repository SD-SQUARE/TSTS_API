// src/seeds/permissionSeeder.ts

import { Permission } from "../../../entities/Permission.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

// Permission codes that match what's used in PermissionProfile
export const PERMISSIONS_DATA = [
  // User Management
  {
    code: "perm-001",
    category: "User Management",
    description: {
      en: "Create new users",
      ar: "إنشاء مستخدمين جدد",
    },
    error: {
      en: "You don't have permission to create users",
      ar: "ليس لديك صلاحية لإنشاء المستخدمين",
    },
  },
  {
    code: "perm-002",
    category: "User Management",
    description: {
      en: "View user information",
      ar: "عرض معلومات المستخدم",
    },
    error: {
      en: "You don't have permission to view users",
      ar: "ليس لديك صلاحية لعرض المستخدمين",
    },
  },
  {
    code: "perm-003",
    category: "User Management",
    description: {
      en: "Update user information",
      ar: "تحديث معلومات المستخدم",
    },
    error: {
      en: "You don't have permission to update users",
      ar: "ليس لديك صلاحية لتحديث المستخدمين",
    },
  },
  {
    code: "perm-004",
    category: "User Management",
    description: {
      en: "Delete users",
      ar: "حذف المستخدمين",
    },
    error: {
      en: "You don't have permission to delete users",
      ar: "ليس لديك صلاحية لحذف المستخدمين",
    },
  },

  // Department Management
  {
    code: "perm-005",
    category: "Department Management",
    description: {
      en: "Create new departments",
      ar: "إنشاء أقسام جديدة",
    },
    error: {
      en: "You don't have permission to create departments",
      ar: "ليس لديك صلاحية لإنشاء الأقسام",
    },
  },
  {
    code: "perm-006",
    category: "Department Management",
    description: {
      en: "View department information",
      ar: "عرض معلومات القسم",
    },
    error: {
      en: "You don't have permission to view departments",
      ar: "ليس لديك صلاحية لعرض الأقسام",
    },
  },
  {
    code: "perm-007",
    category: "Department Management",
    description: {
      en: "Update department information",
      ar: "تحديث معلومات القسم",
    },
    error: {
      en: "You don't have permission to update departments",
      ar: "ليس لديك صلاحية لتحديث الأقسام",
    },
  },
  {
    code: "perm-008",
    category: "Department Management",
    description: {
      en: "Delete departments",
      ar: "حذف الأقسام",
    },
    error: {
      en: "You don't have permission to delete departments",
      ar: "ليس لديك صلاحية لحذف الأقسام",
    },
  },

  // Request Management
  {
    code: "perm-009",
    category: "Request Management",
    description: {
      en: "Create new requests",
      ar: "إنشاء طلبات جديدة",
    },
    error: {
      en: "You don't have permission to create requests",
      ar: "ليس لديك صلاحية لإنشاء الطلبات",
    },
  },
  {
    code: "perm-010",
    category: "Request Management",
    description: {
      en: "View requests",
      ar: "عرض الطلبات",
    },
    error: {
      en: "You don't have permission to view requests",
      ar: "ليس لديك صلاحية لعرض الطلبات",
    },
  },
  {
    code: "perm-011",
    category: "Request Management",
    description: {
      en: "Update request information",
      ar: "تحديث معلومات الطلب",
    },
    error: {
      en: "You don't have permission to update requests",
      ar: "ليس لديك صلاحية لتحديث الطلبات",
    },
  },
  {
    code: "perm-012",
    category: "Request Management",
    description: {
      en: "Delete requests",
      ar: "حذف الطلبات",
    },
    error: {
      en: "You don't have permission to delete requests",
      ar: "ليس لديك صلاحية لحذف الطلبات",
    },
  },
  {
    code: "perm-013",
    category: "Request Management",
    description: {
      en: "Approve or reject requests",
      ar: "الموافقة على الطلبات أو رفضها",
    },
    error: {
      en: "You don't have permission to approve requests",
      ar: "ليس لديك صلاحية للموافقة على الطلبات",
    },
  },

  // Report Management
  {
    code: "perm-014",
    category: "Report Management",
    description: {
      en: "View reports",
      ar: "عرض التقارير",
    },
    error: {
      en: "You don't have permission to view reports",
      ar: "ليس لديك صلاحية لعرض التقارير",
    },
  },
  {
    code: "perm-015",
    category: "Report Management",
    description: {
      en: "Generate new reports",
      ar: "إنشاء تقارير جديدة",
    },
    error: {
      en: "You don't have permission to generate reports",
      ar: "ليس لديك صلاحية لإنشاء التقارير",
    },
  },
  {
    code: "perm-016",
    category: "Report Management",
    description: {
      en: "Export reports",
      ar: "تصدير التقارير",
    },
    error: {
      en: "You don't have permission to export reports",
      ar: "ليس لديك صلاحية لتصدير التقارير",
    },
  },

  // System Settings
  {
    code: "perm-017",
    category: "System Settings",
    description: {
      en: "View system settings",
      ar: "عرض إعدادات النظام",
    },
    error: {
      en: "You don't have permission to view system settings",
      ar: "ليس لديك صلاحية لعرض إعدادات النظام",
    },
  },
  {
    code: "perm-018",
    category: "System Settings",
    description: {
      en: "Update system settings",
      ar: "تحديث إعدادات النظام",
    },
    error: {
      en: "You don't have permission to update system settings",
      ar: "ليس لديك صلاحية لتحديث إعدادات النظام",
    },
  },
];

export async function seedPermissions() {
  try {
    const permissionRepository = PostgresDataSource.getRepository(Permission);

    console.log("🌱 Starting permission seeding...");

    for (const permData of PERMISSIONS_DATA) {
      // Check if permission already exists
      const existing = await permissionRepository.findOne({
        where: { code: permData.code },
      });

      if (existing) {
        console.log(
          `⏭️  Permission "${permData.code}" already exists, skipping...`
        );
        continue;
      }

      const permission = permissionRepository.create(permData);
      await permissionRepository.save(permission);

      console.log(
        `✅ Created permission: ${permData.code} - ${permData.description?.en}`
      );
    }

    console.log("🎉 Permission seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding permissions:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPermissions()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
