import { PermissionProfile } from "../../../entities/PermissionProfile.js";
import { PostgresDataSource } from "../../postgres-data-source.js";

// Define your permission IDs as constants for reuse
export const PERMISSION_IDS = {
  // User Management
  USER_CREATE: "perm-001",
  USER_READ: "perm-002",
  USER_UPDATE: "perm-003",
  USER_DELETE: "perm-004",

  // Department Management
  DEPT_CREATE: "perm-005",
  DEPT_READ: "perm-006",
  DEPT_UPDATE: "perm-007",
  DEPT_DELETE: "perm-008",

  // Request Management
  REQUEST_CREATE: "perm-009",
  REQUEST_READ: "perm-010",
  REQUEST_UPDATE: "perm-011",
  REQUEST_DELETE: "perm-012",
  REQUEST_APPROVE: "perm-013",

  // Report Management
  REPORT_VIEW: "perm-014",
  REPORT_GENERATE: "perm-015",
  REPORT_EXPORT: "perm-016",

  // System Settings
  SETTINGS_VIEW: "perm-017",
  SETTINGS_UPDATE: "perm-018",
};

const permissionProfilesData = [
  {
    name: { en: "Super Admin", ar: "مسؤول النظام الأعلى" },
    descriptions: {
      en: "Full system access with all permissions",
      ar: "صلاحيات كاملة للنظام",
    },
    permissionIds: Object.values(PERMISSION_IDS), // All permissions
  },
  {
    name: { en: "Admin", ar: "مسؤول" },
    descriptions: {
      en: "Administrative access without system settings",
      ar: "صلاحيات إدارية بدون إعدادات النظام",
    },
    permissionIds: [
      PERMISSION_IDS.USER_CREATE,
      PERMISSION_IDS.USER_READ,
      PERMISSION_IDS.USER_UPDATE,
      PERMISSION_IDS.DEPT_CREATE,
      PERMISSION_IDS.DEPT_READ,
      PERMISSION_IDS.DEPT_UPDATE,
      PERMISSION_IDS.REQUEST_READ,
      PERMISSION_IDS.REQUEST_UPDATE,
      PERMISSION_IDS.REQUEST_APPROVE,
      PERMISSION_IDS.REPORT_VIEW,
      PERMISSION_IDS.REPORT_GENERATE,
      PERMISSION_IDS.REPORT_EXPORT,
    ],
  },
  {
    name: { en: "Technician", ar: "فني" },
    descriptions: {
      en: "Technical staff with request management access",
      ar: "موظف فني مع صلاحيات إدارة الطلبات",
    },
    permissionIds: [
      PERMISSION_IDS.REQUEST_READ,
      PERMISSION_IDS.REQUEST_UPDATE,
      PERMISSION_IDS.USER_READ,
      PERMISSION_IDS.DEPT_READ,
    ],
  },
  {
    name: { en: "Department Head", ar: "رئيس القسم" },
    descriptions: {
      en: "Department management and approval authority",
      ar: "إدارة القسم وصلاحيات الموافقة",
    },
    permissionIds: [
      PERMISSION_IDS.USER_READ,
      PERMISSION_IDS.DEPT_READ,
      PERMISSION_IDS.DEPT_UPDATE,
      PERMISSION_IDS.REQUEST_READ,
      PERMISSION_IDS.REQUEST_APPROVE,
      PERMISSION_IDS.REPORT_VIEW,
      PERMISSION_IDS.REPORT_GENERATE,
    ],
  },
  {
    name: { en: "User", ar: "مستخدم" },
    descriptions: {
      en: "Basic user with view and create request permissions",
      ar: "مستخدم أساسي مع صلاحيات العرض وإنشاء الطلبات",
    },
    permissionIds: [
      PERMISSION_IDS.REQUEST_CREATE,
      PERMISSION_IDS.REQUEST_READ,
      PERMISSION_IDS.USER_READ,
    ],
  },
  {
    name: { en: "Read Only", ar: "قراءة فقط" },
    descriptions: {
      en: "View-only access to reports and requests",
      ar: "صلاحيات عرض فقط للتقارير والطلبات",
    },
    permissionIds: [
      PERMISSION_IDS.REQUEST_READ,
      PERMISSION_IDS.REPORT_VIEW,
      PERMISSION_IDS.USER_READ,
      PERMISSION_IDS.DEPT_READ,
    ],
  },
];

export async function seedPermissionProfiles() {
  try {
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    const profileRepository =
      PostgresDataSource.getRepository(PermissionProfile);

    console.log("🌱 Starting permission profile seeding...");

    for (const profileData of permissionProfilesData) {
      // Check if profile already exists by name
      const existingProfile = await profileRepository.findOne({
        where: { name: profileData.name },
      });

      if (existingProfile) {
        console.log(
          `⏭️  Profile "${profileData.name.en}" already exists, skipping...`
        );
        continue;
      }

      const profile = profileRepository.create(profileData);
      await profileRepository.save(profile);

      console.log(
        `✅ Created permission profile: ${profileData.name.en} (${profileData.permissionIds.length} permissions)`
      );
    }

    console.log("🎉 Permission profile seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding permission profiles:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedPermissionProfiles()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
