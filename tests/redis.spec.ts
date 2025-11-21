import { redisClient } from "../src/database/redis";

describe("Redis Test", () => {
    beforeAll(async () => {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
    });

    afterAll(async () => {
      if (redisClient.isOpen) {
        await redisClient.quit();
      }
    });

  it("should set and get a value", async () => {
    await redisClient.set("test-key", "123");
    const val = await redisClient.get("test-key");
    expect(val).toBe("123");
  });
});
