import { log } from "console";
import { createClient } from "redis";
import logger  from "../utils/logger";

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
    console.error("Redis Client Error", err);
    logger.error("Redis Client Error", err);
});

await redisClient.connect();

export default redisClient;
