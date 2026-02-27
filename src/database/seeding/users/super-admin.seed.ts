import { DataSource } from "typeorm";
import { User } from "../../../entities/index.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { UserStatus } from "../../../enums/UserStatus.enum.js";
import { hashPassword } from "../../../utils/secrets.js";

export async function seedSuperAdmin(
  dataSource: DataSource,
  count = 1
): Promise<void> {
  const userRepo = dataSource.getRepository(User);

  for (let i = 1; i <= count; i++) {
    const email = i === 1 ? "superadmin@tsts.com" : `superadmin${i}@tsts.com`;

    // Check if super admin already exists
    const existing = await userRepo
      .createQueryBuilder("u")
      .where("u.email = :email", { email })
      .andWhere("u.deletedAt IS NULL")
      .getOne();

    if (existing) {
      console.log(`ℹ️ [SuperAdminSeed] Super admin already exists: ${email}`);
      continue;
    }

    console.log(`🚀 [SuperAdminSeed] Creating super admin: ${email}`);

    // Create super admin user
    const superAdmin = new User();
    superAdmin.email = email;
    superAdmin.password = await hashPassword("SuperAdmin@123456");
    superAdmin.user_type = UserType.SUPER_ADMIN;
    superAdmin.status = UserStatus.ACTIVE;
    
    superAdmin.firstName = {
      en: "Super",
      ar: "سوبر",
    };
    
    superAdmin.midName = {
      en: "System",
      ar: "نظام",
    };
    
    superAdmin.lastName = {
      en: i === 1 ? "Admin" : `Admin${i}`,
      ar: i === 1 ? "أدمن" : `أدمن${i}`,
    };
    
    superAdmin.fullName = {
      en: i === 1 ? "Super Admin" : `Super Admin${i}`,
      ar: i === 1 ? "سوبر أدمن" : `سوبر أدمن${i}`,
    };
    
    superAdmin.ssn = (10000000000000 + i - 1).toString();
    
    superAdmin.contacts = {
      mobile: [`0100000000${i}`],
      phone: [],
    };
    
    superAdmin.job = {
      en: "Super Administrator",
      ar: "مدير النظام الرئيسي",
    };

    await userRepo.save(superAdmin);
    
    console.log(`✅ [SuperAdminSeed] Super admin created successfully: ${email}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: SuperAdmin@123456`);
  }
}
