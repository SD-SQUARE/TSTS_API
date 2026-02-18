import "reflect-metadata";

import dotenv from "dotenv";
import path from "path";
dotenv.config();

import { initDataSource } from "./database/postgres-data-source.js";
import app from "./app.js";
import logger from "./utils/logger.js";
import { connectRedis } from "./database/redis.js";
import { ensureBucketExists } from "./utils/storage.js";
import { initSocket } from "./config/socket.js";
import http from "http";

const HOST = process.env.HOST ?? "localhost";
const PORT = process.env.PORT ?? 3000;
const BUCKET = process.env.MINIO_BUCKET!;
const server = http.createServer(app);

/**
 * Main entry point of the server.
 * Initializes the database and Redis, ensures the S3 bucket exists, and starts the server.
 * If an error occurs during startup, logs the error and exits the process with a status code of 1.
 */
async function main() {
  try {
    initDataSource();
    connectRedis();
    await ensureBucketExists(BUCKET);

    server.listen(PORT, () => {
      logger.info(`[server] listening on http://${HOST}:${PORT}`);
      initSocket(server);
    });
  } catch (err) {
    logger.error("❌ Server failed to start", err);
    process.exit(1);
  }
}

main();
