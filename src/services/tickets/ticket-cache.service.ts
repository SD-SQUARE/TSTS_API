import { redisClient } from "../../database/redis.js";
import { redisKeys } from "../../utils/redisKeys.js";
import logger from "../../utils/logger.js";

export const TICKET_ANALYTICS_TTL_SECONDS = 60;

export const readJsonCache = async <T>(key: string): Promise<T | null> => {
  if (!redisClient.isOpen) return null;

  try {
    const cached = await redisClient.get(key);
    return cached ? (JSON.parse(String(cached)) as T) : null;
  } catch (error) {
    logger.warn("[cache] failed to read json cache", {
      key,
      error: (error as Error).message,
    });
    return null;
  }
};

export const writeJsonCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
) => {
  if (!redisClient.isOpen) return;

  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    logger.warn("[cache] failed to write json cache", {
      key,
      error: (error as Error).message,
    });
  }
};

export const invalidateCachePattern = async (pattern: string) => {
  if (!redisClient.isOpen) return;

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) {
      await redisClient.del(keys);
    }
  } catch (error) {
    logger.warn("[cache] failed to invalidate pattern", {
      pattern,
      error: (error as Error).message,
    });
  }
};

export const invalidateTicketAnalyticsCache = () =>
  invalidateCachePattern(`${redisKeys.ticketAnalyticsPrefix}:*`);
