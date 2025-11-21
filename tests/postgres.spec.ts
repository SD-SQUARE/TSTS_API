import { randomUUID } from "crypto";
import { PostgresDataSource } from "../src/database/postgres-data-source";
import { User } from "../src/entities/User";

describe("Postgres + TypeORM Test", () => {
    beforeAll(async () => {
      if (!PostgresDataSource.isInitialized) {
        await PostgresDataSource.initialize();
      }
    });

    afterAll(async () => {
      if (PostgresDataSource.isInitialized) {
        await PostgresDataSource.destroy();
      }
    });

  it("should insert & retrieve a user", async () => {
    const repo = PostgresDataSource.getRepository(User);

    const user = repo.create({
        firstName: {
          en: "Ahmed",
          ar: "احمد",
        },
      email: `ahmed${randomUUID().split("-")[0]}@example.com`,
      password: "123456",
    });

    await repo.save(user);

    const result = await repo.find();
    expect(result.length).not.toBe(0);
    expect(result[0].email).toBe("ahmed@example.com");
  });
});
