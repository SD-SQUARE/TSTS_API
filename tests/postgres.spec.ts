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
        name: "Ahmed",
      email: "ahmed@example.com",
    });

    await repo.save(user);

    const result = await repo.find();
    expect(result.length).toBe(1);
    expect(result[0].email).toBe("ahmed@example.com");
  });
});
