import { spawnSync } from "node:child_process";
import path from "node:path";

const [, , action, migrationName] = process.argv;

const cliPath = path.resolve("node_modules/typeorm/cli.js");
const dataSourcePath = path.resolve("src/database/postgres-data-source.ts");

if (!action || !["create", "generate"].includes(action)) {
  console.error("Usage: node scripts/typeorm.mjs <create|generate> <migration-name>");
  process.exit(1);
}

if (!migrationName) {
  console.error("A migration name is required.");
  process.exit(1);
}

const migrationPath = path.resolve("src/migrations", migrationName);
const args = ["--import", "tsx", cliPath];

if (action === "create") {
  args.push("migration:create", migrationPath);
} else {
  args.push("migration:generate", migrationPath, "-d", dataSourcePath);
}

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  stdio: "inherit",
});

process.exit(result.status ?? 1);
