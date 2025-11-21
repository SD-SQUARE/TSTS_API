// src/database/redis.ts
import { createClient, RedisClientType } from "redis";
import logger from "../utils/logger.js";

const REDIS_URL =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || "localhost"}:${
    process.env.REDIS_PORT || 6379
  }`;

export const redisClient: RedisClientType = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: false,
  },
});

redisClient.on("connect", () => logger.info("[redis] connecting..."));
redisClient.on("ready", () => logger.info("[redis] ready"));
redisClient.on("error", (err) => logger.error("[redis] error:", err.message));
redisClient.on("end", () => logger.info("[redis] connection closed"));

// Explicit connect function for tests
export async function connectRedis() {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      logger.info(`[redis] redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
      logger.info("[redis] connected successfully");
    } catch (err) {
      logger.error(
        "[redis] failed to connect, continuing without cache",
        (err as Error).message
      );
    }
  }
}

// Flush all keys safely
export async function flushRedis() {
  if (redisClient.isOpen) {
    try {
      await redisClient.flushAll();
      logger.info("[redis] flushed all keys");
    } catch (err) {
      logger.error("[redis] failed to flush:", (err as Error).message);
    }
  }
}

// Disconnect safely
export async function disconnectRedis() {
  if (redisClient.isOpen) {
    try {
      await redisClient.quit();
      logger.info("[redis] connection closed gracefully");
    } catch (err) {
      logger.error("[redis] failed to close:", (err as Error).message);
    }
  }
}
