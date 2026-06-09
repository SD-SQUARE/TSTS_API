/**
 * Integration tests – API Integrations (api-keys) routes
 * Auth middleware is mocked to inject a fake admin user.
 */

// ── Mock external I/O ───────────────────────────────────────────────────────

jest.mock("../../src/database/postgres-data-source.js", () => ({
  PostgresDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((e: any) => Promise.resolve(e)),
      create: jest.fn().mockImplementation((e: any) => e),
      update: jest.fn().mockResolvedValue({}),
      softRemove: jest.fn().mockResolvedValue({}),
    }),
  },
}));

jest.mock("../../src/database/redis.js", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    isOpen: true,
    connect: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("../../src/database/mongo-data-source.js", () => ({
  MongoDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn().mockReturnValue({ find: jest.fn(), save: jest.fn() }),
  },
}));

jest.mock("../../src/config/socket.js", () => ({
  io: { use: jest.fn(), on: jest.fn(), emit: jest.fn(), to: jest.fn().mockReturnThis() },
  initSocket: jest.fn(),
}));

jest.mock("../../src/config/mailer.js", () => ({
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), http: jest.fn() },
}));

jest.mock("../../src/helpers/auditBuilder.js", () => ({
  audit: jest.fn().mockReturnValue({
    step: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    resource: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockReturnThis(),
    summary: jest.fn().mockReturnThis(),
  }),
}));

// Mock JWT so Bearer token passes through authMiddleware
jest.mock("../../src/utils/jwt.js", () => ({
  generateToken: jest.fn().mockReturnValue("mock-token"),
  verifyToken: jest.fn().mockReturnValue({
    id: "admin-uuid-1",
    email: "admin@tsts.local",
    role: "SUPER_ADMIN",
    permissions: [
      "api_integrations.view",
      "api_integrations.manage",
      "api_integrations.external",
    ],
    name: { first: { en: "Admin" }, last: { en: "User" } },
  }),
}));

import request from "supertest";
import app from "../../src/app.js";

const ADMIN_BEARER = "Bearer valid-admin-token";

describe("Integration – GET /api/v1/api-integrations/meta", () => {
  it("returns 200 with zones and methods arrays", async () => {
    const res = await request(app)
      .get("/api/v1/api-integrations/meta")
      .set("Authorization", ADMIN_BEARER);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("zones");
    expect(res.body).toHaveProperty("methods");
    expect(Array.isArray(res.body.zones)).toBe(true);
    expect(Array.isArray(res.body.methods)).toBe(true);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/v1/api-integrations/meta");
    expect(res.status).toBe(401);
  });
});

describe("Integration – GET /api/v1/api-integrations/keys", () => {
  it("returns 200 with a keys array (empty when no keys in DB)", async () => {
    const res = await request(app)
      .get("/api/v1/api-integrations/keys")
      .set("Authorization", ADMIN_BEARER);

    expect(res.status).toBe(200);
    // The response may be { keys: [] } or an array directly
    const keys = Array.isArray(res.body) ? res.body : (res.body.keys ?? res.body.data ?? []);
    expect(Array.isArray(keys)).toBe(true);
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/v1/api-integrations/keys");
    expect(res.status).toBe(401);
  });
});
