
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

import "reflect-metadata";
import { PostgresDataSource } from "./database/postgres-data-source.js";
import app from "./app.js";
import logger from "./utils/logger.js";


const PORT = process.env.PORT || 3000;

PostgresDataSource.initialize()
  .then(() => {
    console.log("DataSource initialized");
    app.listen(PORT, () => {
        logger.info(`Server listening on http://localhost:${PORT}`);
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("Error during Data Source initialization", err);
    console.error("Error during Data Source initialization", err);
    process.exit(1);
  });
