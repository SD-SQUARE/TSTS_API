
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), "src/.env") });

import "reflect-metadata";
import { initDataSource } from "./database/postgres-data-source.js";
import app from "./app.js";
import logger from "./utils/logger.js";
import { connectRedis } from "./database/redis.js";
import { initSocket } from "./config/socket.js";
import http from "http";

const HOST = process.env.HOST ?? "localhost";
const PORT = process.env.PORT ?? 3000;
const server = http.createServer(app);

/**
 * Main entry point of the application.
 * Initializes the Postgres data source and connects to Redis. !! without waitting for it to connect !!
 * Then starts the Express app listening on the specified port.
 */
async function main() {
    initDataSource();
    connectRedis();
    initSocket(server);
    server.listen(PORT, () => {
        logger.info(`[server] listening on http://${HOST}:${PORT}`);
    });
    
}

main();