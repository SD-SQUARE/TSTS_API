#!/usr/bin/env node
/**
 * Cross-platform docs build + copy script.
 * Two-phase build:
 *   Phase 1 — Docusaurus generates .docusaurus/ cache files (codegen only)
 *   Patch    — Fix absolute Windows paths in client-modules.js
 *   Phase 2  — Docusaurus webpack build (uses patched cache)
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const { cpSync, rmSync, mkdirSync, existsSync } = fs;
const path = require("path");

const root = path.join(__dirname, "..");
const docsSite = path.join(root, "docs-site");
const cacheDir = path.join(docsSite, ".docusaurus");
const buildDir = path.join(docsSite, "build");
const out = buildDir;
const dest = path.join(root, "../client/tsts/public/docs");

// ─── Step 1: Apply node_modules patches ──────────────────────────────────────
console.log("[docs-build] Running patch-docusaurus-registry...");
require(path.join(docsSite, "scripts/patch-docusaurus-registry.cjs"));

// ─── Step 2: Clear cache so codegen re-runs ───────────────────────────────────
console.log("[docs-build] Clearing Docusaurus cache and previous build...");
rmSync(cacheDir, { recursive: true, force: true });
rmSync(buildDir, { recursive: true, force: true });

// ─── Step 3: Phase 1 build — runs codegen, generates .docusaurus/ files ──────
// We run docusaurus build and let it generate the cache. It will fail at the
// webpack step because of the absolute paths — that's fine, we patch then retry.
console.log("[docs-build] Phase 1: generating Docusaurus cache files...");
const phase1 = spawnSync("npx", ["docusaurus", "build"], {
  cwd: docsSite,
  stdio: "inherit",
  env: { ...process.env },
  shell: true,
});
// Phase 1 may succeed or fail — either way .docusaurus/ is now populated

// ─── Step 4: Patch client-modules.js ─────────────────────────────────────────
const clientModulesFile = path.join(cacheDir, "client-modules.js");
if (existsSync(clientModulesFile)) {
  console.log("[docs-build] Patching client-modules.js...");
  const docsSiteNorm = docsSite.replace(/\\/g, "/");
  const content = fs.readFileSync(clientModulesFile, "utf8");

  const patched = content.replace(
    /require\("([^"]+)"\)/g,
    (match, absPath) => {
      let p = absPath.replace(/\\/g, "/");
      // Make absolute path relative to docsSite
      if (p.startsWith(docsSiteNorm + "/")) {
        p = "./" + p.slice(docsSiteNorm.length + 1);
      }
      // Add .js extension to extensionless module paths (not CSS/images)
      if (!/\.(js|jsx|ts|tsx|css|less|scss|sass|json|svg|png|jpg|gif|ico|woff|woff2|ttf|eot)$/.test(p)) {
        p = p + ".js";
      }
      return `require("${p}")`;
    }
  );

  if (patched !== content) {
    fs.writeFileSync(clientModulesFile, patched, "utf8");
    console.log("[docs-build] client-modules.js patched.");
  } else {
    console.log("[docs-build] client-modules.js — no changes needed.");
  }
} else {
  console.warn("[docs-build] Warning: client-modules.js not found in cache.");
}

// If phase 1 already succeeded, we're done
if (phase1.status === 0) {
  console.log("[docs-build] Build succeeded in phase 1.");
} else {
  // ─── Step 5: Phase 2 build — re-run with patched cache ─────────────────────
  console.log("[docs-build] Phase 2: re-running Docusaurus build with patched cache...");
  execSync("npx docusaurus build", {
    cwd: docsSite,
    stdio: "inherit",
    env: { ...process.env },
    shell: true,
  });
}

// ─── Step 6: Copy output ──────────────────────────────────────────────────────
console.log("[docs-build] Copying build output to", dest);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(out, dest, { recursive: true });
console.log("[docs-build] Done. Docs copied to", dest);
