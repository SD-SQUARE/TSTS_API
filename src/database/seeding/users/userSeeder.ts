import { User } from "../../../entities/User.js";
import { UserStatus } from "../../../enums/UserStatus.enum.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { PostgresDataSource } from "../../postgres-data-source.js";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

const usersData = [
  {
    email: "admin@example.com",
    password: "Admin@123",
    firstName: { en: "Admin", ar: "مسؤول" },
    lastName: { en: "User", ar: "مستخدم" },
    user_type: UserType.ADMIN,
    status: UserStatus.ACTIVE,
    contacts: {
      mobile: ["+201234567890"],
      phone: ["+20223456789"],
    },
    job: { en: "System Administrator", ar: "مسؤول النظام" },
  },
  {
    email: "technician@example.com",
    password: "Tech@123",
    firstName: { en: "John", ar: "جون" },
    midName: { en: "Michael", ar: "مايكل" },
    lastName: { en: "Doe", ar: "دو" },
    ssn: "12345678901234",
    user_type: UserType.TECHNICIAN,
    status: UserStatus.ACTIVE,
    contacts: {
      mobile: ["+201111111111"],
    },
    job: { en: "Senior Technician", ar: "فني أول" },
  },
  {
    email: "user@example.com",
    password: "User@123",
    firstName: { en: "Jane", ar: "جين" },
    lastName: { en: "Smith", ar: "سميث" },
    user_type: UserType.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
    contacts: {
      mobile: ["+202222222222"],
      phone: ["+20225555555"],
    },
  },
];

export async function seedUsers() {
  try {
    // Initialize data source if not already initialized
    if (!PostgresDataSource.isInitialized) {
      await PostgresDataSource.initialize();
    }

    const userRepository = PostgresDataSource.getRepository(User);

    console.log("🌱 Starting user seeding...");

    for (const userData of usersData) {
      // Check if user already exists
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

      // Create user
      const user = userRepository.create({
        ...userData,
        password: hashedPassword,
      });

      await userRepository.save(user);
      console.log(`✅ Created user: ${userData.email}`);
    }

    console.log("🎉 User seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    throw error;
  }
}

// Run seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsers()
    .then(() => {
      console.log("✨ Seeding finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding failed:", error);
      process.exit(1);
    });
}
