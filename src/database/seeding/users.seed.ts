// src/seeds/users.seed.ts
import { DataSource } from "typeorm";
import { UserType } from "../../enums/UserType.enum.js";
import { Domain, University, User } from "../../entities/index.js";
import { UserStatus } from "../../enums/UserStatus.enum.js";

const usersSeedData: Array<{
  email: string;
  password: string; // TODO: replace with hashed password if app requires
  firstName?: { en?: string; ar?: string };
  midName?: { en?: string; ar?: string };
  lastName?: { en?: string; ar?: string };
  ssn?: string;
  user_type?: UserType;
  universityEn?: string;
  domainEn?: string;
  job?: { en?: string; ar?: string };
}> = [
  {
    email: "admin@example.com",
    password: "Admin@123456", // ⚠️ change to hashed in real app
    firstName: { en: "System", ar: "نظام" },
    lastName: { en: "Admin", ar: "مسؤول" },
    ssn: "12345678901234",
    user_type: UserType.ADMIN, // adjust if your enum uses different value (Admin vs ADMIN)
    universityEn: "Helwan University",
    domainEn: "Faculty of Engineering",
    job: { en: "System Administrator", ar: "مسؤول نظام" },
  },
];

export async function seedUsers(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const uniRepo = dataSource.getRepository(University);
  const domainRepo = dataSource.getRepository(Domain);

  for (const u of usersSeedData) {
    const existing = await userRepo
      .createQueryBuilder("user")
      .where("user.email = :email", { email: u.email })
      .andWhere("user.deletedAt IS NULL")
      .getOne();

    let university: University | null = null;
    let domain: Domain | null = null;

    if (u.universityEn) {
      university = await uniRepo
        .createQueryBuilder("uni")
        .where("uni.name->>'en' = :nameEn", { nameEn: u.universityEn })
        .andWhere("uni.deletedAt IS NULL")
        .getOne();
    }

    if (u.domainEn) {
      domain = await domainRepo
        .createQueryBuilder("d")
        .where("d.name->>'en' = :domainEn", { domainEn: u.domainEn })
        .andWhere("d.deletedAt IS NULL")
        .getOne();
    }

    if (existing) {
      existing.firstName = u.firstName;
      existing.midName = u.midName;
      existing.lastName = u.lastName;
      existing.ssn = u.ssn;
      existing.user_type = u.user_type;
      existing.status = UserStatus.ACTIVE;
      existing.job = u.job;
      if (university) existing.university = university;
      if (domain) existing.domain = domain;

      await userRepo.save(existing);
      console.log(`✅ [User] Updated: ${u.email}`);
    } else {
      const newUser = userRepo.create({
        email: u.email,
        password: u.password,
        firstName: u.firstName,
        midName: u.midName,
        lastName: u.lastName,
        ssn: u.ssn,
        user_type: u.user_type,
        status: UserStatus.ACTIVE,
        job: u.job,
        university: university ?? undefined,
        domain: domain ?? undefined,
      });

      await userRepo.save(newUser);
      console.log(`✅ [User] Inserted: ${u.email}`);
    }
  }
}
