import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const resolveSeedDataFile = (
  importMetaUrl: string,
  seedRelativeDir: string[],
  fileName: string,
) => {
  const runtimeDirectory = path.dirname(fileURLToPath(importMetaUrl));
  const checkedPaths = [
    path.join(runtimeDirectory, fileName),
    path.resolve(
      process.cwd(),
      "src",
      "database",
      "seeding",
      ...seedRelativeDir,
      fileName,
    ),
    path.resolve(
      process.cwd(),
      "dist",
      "database",
      "seeding",
      ...seedRelativeDir,
      fileName,
    ),
  ];

  const foundPath = checkedPaths.find((candidate) => fs.existsSync(candidate));
  if (!foundPath) {
    throw new Error(
      `Seed data file not found: ${fileName}. Checked: ${checkedPaths.join(", ")}`,
    );
  }

  return foundPath;
};

