const fs = require("node:fs");
const path = require("node:path");

// Fix prism-include-languages.js: the import is commented out but the call remains
const prismFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "@docusaurus",
  "theme-classic",
  "lib",
  "prism-include-languages.js",
);
if (fs.existsSync(prismFile)) {
  const current = fs.readFileSync(prismFile, "utf8");
  const patched = current
    .replace(
      "// import prismIncludeLanguages from '@theme/prism-include-languages';",
      "import prismIncludeLanguages from '@theme/prism-include-languages';",
    );
  if (patched !== current) {
    fs.writeFileSync(prismFile, patched);
  }
}

const files = [
  path.join(
    __dirname,
    "..",
    "node_modules",
    "@docusaurus",
    "core",
    "lib",
    "server",
    "codegen",
    "codegenRoutes.js",
  ),
  path.join(
    __dirname,
    "..",
    "node_modules",
    "@docusaurus",
    "core",
    "lib",
    "client",
    "exports",
    "ComponentCreator.js",
  ),
  path.join(
    __dirname,
    "..",
    "node_modules",
    "@docusaurus",
    "core",
    "lib",
    "ssg",
    "ssgNodeRequire.js",
  ),
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;

  const current = fs.readFileSync(file, "utf8");
  let patched = current.replace(
    /\(typeof require\.resolveWeak === "function" \? require\.resolveWeak\(([^)]+)\) : null\)/g,
    "require.resolveWeak($1)",
  );

  if (file.endsWith(path.join("codegen", "codegenRoutes.js"))) {
    patched = patched.replace("`module.exports = {", "`export default {");
    // Replace require.resolveWeak() in the genRegistry template string with null
    // to prevent absolute Windows paths from being emitted into the client bundle
    patched = patched.replace(
      '`, "${modulePath}", require.resolveWeak("${modulePath}")],`',
      '`, "${modulePath}", null],`',
    );
  }

  if (file.endsWith(path.join("ssg", "ssgNodeRequire.js"))) {
    // Only patch if not already patched
    if (!patched.includes("startsWith('@theme/')")) {
      // Replace the ssgRequireFunction body to skip webpack virtual aliases
      patched = patched.replace(
        "    const ssgRequireFunction = (id) => {\n        if (/\\.(css|scss|sass|less)$/.test(id)) {\n            allRequiredIds.push(id);\n            return {};\n        }\n        const module = realRequire(id);\n",
        "    const ssgRequireFunction = (id) => {\n        if (/\\.(css|scss|sass|less)$/.test(id) || id.includes('prism-include-languages') || id.includes('nprogress') || id.startsWith('@theme/') || id.startsWith('@site/') || id.startsWith('@generated/') || id.startsWith('@docusaurus/')) {\n            allRequiredIds.push(id);\n            const stub = function SSGStub() { return null; }; stub.__esModule = true; stub.default = stub; return stub;\n        }\n        const module = realRequire(id);\n",
      );
      // Also handle the original unpatched form (no CSS guard)
      patched = patched.replace(
        "    const ssgRequireFunction = (id) => {\n        const module = realRequire(id);\n",
        "    const ssgRequireFunction = (id) => {\n        if (/\\.(css|scss|sass|less)$/.test(id) || id.includes('prism-include-languages') || id.includes('nprogress') || id.startsWith('@theme/') || id.startsWith('@site/') || id.startsWith('@generated/') || id.startsWith('@docusaurus/')) {\n            allRequiredIds.push(id);\n            const stub = function SSGStub() { return null; }; stub.__esModule = true; stub.default = stub; return stub;\n        }\n        const module = realRequire(id);\n",
      );
    }
    if (!patched.includes('ssgRequireFunction.resolveWeak')) {
      patched = patched.replace(
        "    ssgRequireFunction.resolve = realRequire.resolve;\n",
        "    ssgRequireFunction.resolve = realRequire.resolve;\n    ssgRequireFunction.resolveWeak = (id) => id;\n",
      );
    }
  }

  if (patched !== current) {
    fs.writeFileSync(file, patched);
  }
}
