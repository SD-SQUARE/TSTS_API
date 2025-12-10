import { DataSource } from "typeorm";
import { User } from "../../entities/User.js";
import { Faker, en } from "@faker-js/faker";

// Function to loop over all users and update with avatar URL
export async function addAvatarsToUsers(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const faker = new Faker({ locale: [en] });

  const users = await userRepo.find();

  if (users.length === 0) {
    console.log("⚠️ No users found to update.");
    return;
  }

  console.log(`ℹ️ Found ${users.length} users. Updating avatars...`);

  for (const user of users) {
    const avatarUrl = faker.image.avatar();

    user.image = avatarUrl;

    await userRepo.save(user);

    console.log(`✅ Updated avatar for user: ${user.email}`);
  }

  console.log("✅ All users have been updated with avatars.");
}
