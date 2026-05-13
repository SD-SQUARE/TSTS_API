import fs from "fs";
import path from "path";

const sourceRoot = path.resolve("src", "database", "seeding");
const targetRoot = path.resolve("dist", "database", "seeding");

const copyJsonFiles = (currentDir) => {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const sourcePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      copyJsonFiles(sourcePath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const relativePath = path.relative(sourceRoot, sourcePath);
    const targetPath = path.join(targetRoot, relativePath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
  }
};

copyJsonFiles(sourceRoot);

