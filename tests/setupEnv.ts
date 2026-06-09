// Load test environment variables before any test module is imported.
// Create api/.env.test with overrides for the test environment.
import { config } from "dotenv";
import path from "path";

// __dirname available via ts-jest in ESM mode
config({ path: path.join(process.cwd(), ".env.test") });

// Set sensible defaults if not provided
process.env.NODE_ENV ??= "test";
process.env.JWT_SECRET ??= "test-secret-key-for-jest-only";
process.env.OLLAMA_HOST ??= "http://localhost:11434";
process.env.OLLAMA_MODEL ??= "llama3.2";
process.env.MINIO_BUCKET ??= "tsts-test";
