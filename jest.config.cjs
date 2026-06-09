/**
 * CommonJS Jest configuration for environments that cannot handle
 * the ESM `export default` in jest.config.js.
 *
 * This mirrors jest.config.js exactly but uses module.exports.
 * If Jest loads jest.config.js successfully, this file is redundant
 * but harmless.
 */

module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],

  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },

  // Resolve ESM-style .js imports to TypeScript source files
  moduleNameMapper: {
    "^(src/.+)\\.js$": "$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // Load .env.test before any module is imported
  setupFiles: ["<rootDir>/tests/setupEnv.ts"],

  // Test match patterns
  testMatch: [
    "**/__tests__/**/*.ts",
    "**/?(*.)+(spec|test).ts",
  ],
};
