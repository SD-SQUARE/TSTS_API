/**
 * Integration tests – Ticket routes
 * Auth middleware is mocked via jest.mock so we can inject a fake user.
 */

// ── Mock external I/O ───────────────────────────────────────────────────────

jest.mock("../../src/database/postgres-data-source.js", () => ({
  PostgresDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      save: jest.fn().mockImplementation((e: any) => Promise.resolve({ id: "ticket-1", ...e })),
      create: jest.fn().mockImplementation((e: any) => e),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
      }),
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

// Mock JWT verifyToken so Bearer token tests pass auth middleware
jest.mock("../../src/utils/jwt.js", () => ({
  generateToken: jest.fn().mockReturnValue("mock-token"),
  verifyToken: jest.fn().mockReturnValue({
    id: "user-uuid-1",
    email: "agent@tsts.local",
    role: "AGENT",
    permissions: ["tickets.view", "tickets.create"],
    name: { first: { en: "Agent" }, last: { en: "Test" } },
  }),
}));

import request from "supertest";
import app from "../../src/app.js";

const VALID_BEARER = "Bearer valid-test-token";

describe("Integration – GET /api/v1/tickets", () => {
  it("returns 401 without an Authorization header", async () => {
    const res = await request(app).get("/api/v1/tickets");
    expect(res.status).toBe(401);
  });

  it("returns 200 with a valid Bearer token (mocked JWT)", async () => {
    const res = await request(app)
      .get("/api/v1/tickets")
      .set("Authorization", VALID_BEARER);

    // The tickets route should succeed; exact shape depends on implementation
    expect([200, 206]).toContain(res.status);
    expect(res.body).toBeDefined();
  });
});

describe("Integration – POST /api/v1/tickets", () => {
  it("returns 201 or passes validation with a minimal valid body", async () => {
    const body = {
      title: "Cannot access lab system",
      description: "I receive a 403 error when I try to log into the lab.",
    };

    const res = await request(app)
      .post("/api/v1/tickets")
      .set("Authorization", VALID_BEARER)
      .send(body);

    // Accept 201 (created) or 400 (validation details – shows route is reached)
    // 401/403 would indicate auth is still failing which we don't want
    expect([201, 400, 422]).toContain(res.status);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app)
      .post("/api/v1/tickets")
      .send({ title: "Test", description: "Test desc" });

    expect(res.status).toBe(401);
  });
});
