// jest.config.ts
export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  // Use transform to pass ts-jest options (recommended)
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  // Map .js imports to TypeScript sources so ESM-style .js imports resolve in tests
  moduleNameMapper: {
    "^(src/.+)\\.js$": "$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // Load env before any modules import
  setupFiles: ["<rootDir>/tests/setupEnv.ts"]
};
