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
import https from "https";
import fs from "fs";
import { BaseReportGeneratorPuppeteer } from "./services/reports/base/BaseReportGeneratorPuppeteer.js";
import { initMongoDataSource } from "./database/mongo-data-source.js";

const PROTOCOL = process.env.PROTOCOL ?? "http";
const HOST = process.env.HOST ?? "localhost";
const PORT = process.env.PORT ?? 3000;
const BUCKET = process.env.MINIO_BUCKET!;
let server;

if(PROTOCOL === "https") {
  const HTTPS_OPTIONS = {
    key: fs.readFileSync("/certs/staging.myapp.local-key.pem"),
    cert: fs.readFileSync("/certs/staging.myapp.local.pem"),
    ca: fs.readFileSync("/certs/rootCA.pem"), // optional for client trust
  };
  
  server = https.createServer(HTTPS_OPTIONS,app);
}
else
{
  server = http.createServer(app);
}



/**
 * Main entry point of the server.
 * Initializes the database and Redis, ensures the S3 bucket exists, and starts the server.
 * If an error occurs during startup, logs the error and exits the process with a status code of 1.
 */
async function main() {
  try {
    initDataSource();
    initMongoDataSource();
    connectRedis();
    await ensureBucketExists(BUCKET);

    // Pre-warm Puppeteer browser for faster PDF generation
    BaseReportGeneratorPuppeteer.warmUp().catch(err => {
      logger.warn('[Puppeteer] Failed to warm up browser:', err);
    });

    server.listen(PORT, () => {
      logger.info(`[server] listening on ${PROTOCOL}://${HOST}:${PORT}`);
      initSocket(server);
    });
  } catch (err) {
    logger.error("❌ Server failed to start", {
      message: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  }
}

main();
