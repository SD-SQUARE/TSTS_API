
import { copyFile } from "fs/promises";

async function main() {
    const FROM = `./secrets/.env.example`;
    const DOCKER_ENV_PATH = `./docker/.env`;
    const SRC_ENV_PATH = `./src/.env`;
    const TEST_ENV_PATH = `./tests/.env.test`;
  try {
    await copyFile(FROM, DOCKER_ENV_PATH);
    await copyFile(FROM, SRC_ENV_PATH);
    await copyFile(FROM, TEST_ENV_PATH);
    console.log("Copied .env.example to docker and src folders ✅");
  } catch (err) {
    console.error("Failed to copy .env.example:", err);
    process.exit(1);
  }
}

main();
