import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

import logger from '../utils/logger.js';
import * as entities from '../entities/mongo-entities/Index.js';

const HOST = process.env.MONGO_HOST ?? 'localhost';
const PORT = process.env.MONGO_PORT ?? '27017';
const USER = process.env.MONGO_USER ?? 'root';
const PASSWORD = process.env.MONGO_PASSWORD ?? 'root';
const DATABASE = process.env.MONGO_DB ?? 'tsts_mongo';

export const MongoDataSource = new DataSource({
  type: 'mongodb',
  host: HOST,
  port: Number(PORT),
  username: USER,
  password: PASSWORD,
  database: DATABASE,
  authSource: 'admin',
  synchronize: true,
  logging: true,
  entities: Object.values(entities),
});

export async function initMongoDataSource() {
  try {
    if (!MongoDataSource.isInitialized) {
      await MongoDataSource.initialize();

      logger.info(
        `[mongodb] Connected: mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
      );
    }

    return MongoDataSource;
  } catch (err: any) {
    logger.error(`[mongodb] Error initializing database: ${err.message}`);
    process.exit(1);
  }
}

export async function destroyMongoDataSource() {
  if (MongoDataSource.isInitialized) {
    await MongoDataSource.destroy();
    logger.info(`[mongodb] Disconnected`);
  }
}
