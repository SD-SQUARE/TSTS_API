/**
 * Integration tests – Auth routes
 * Uses supertest against the Express app with DB/Redis mocked.
 */

// ── Mock all external I/O before importing the app ─────────────────────────

jest.mock("../../src/database/postgres-data-source.js", () => ({
  PostgresDataSource: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: true,
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn(),
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
  io: { use: jest.fn(), on: jest.fn(), emit: jest.fn() },
  initSocket: jest.fn(),
}));

jest.mock("../../src/config/mailer.js", () => ({ sendMail: jest.fn().mockResolvedValue(undefined) }));

jest.mock("../../src/utils/logger.js", () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    http: jest.fn(),
  },
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

// Mock the auth service so we control login/logout behaviour
jest.mock("../../src/services/auth.service.js", () => ({
  loginUser: jest.fn(),
  logoutUser: jest.fn().mockResolvedValue(undefined),
  generateCsrfForUser: jest.fn(),
  getRefreshTokenById: jest.fn(),
  forgetPassword: jest.fn(),
  verifyOtp: jest.fn(),
  resetPassword: jest.fn(),
  resetAttempts: jest.fn(),
  handleFailedAttempt: jest.fn(),
  isLocked: jest.fn().mockResolvedValue(false),
  findByEmail: jest.fn().mockResolvedValue(null),
  cacheTokens: jest.fn().mockResolvedValue(undefined),
  setStatusActive: jest.fn().mockResolvedValue(undefined),
  generateCsrfToken: jest.fn().mockReturnValue("a".repeat(64)),
  generateAuthTokens: jest.fn().mockReturnValue({
    accessToken: "fake-access",
    refreshToken: "fake-refresh",
  }),
  getEffectivePermissionKeysForUser: jest.fn().mockResolvedValue([]),
}));

import request from "supertest";
import app from "../../src/app.js";
import { loginUser } from "../../src/services/auth.service.js";

const mockLoginUser = loginUser as jest.Mock;

describe("Integration – POST /api/v1/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 200 with access_token on valid credentials", async () => {
    mockLoginUser.mockResolvedValueOnce({
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      email: "admin@tsts.local",
      permissions: ["tickets.view"],
    });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@tsts.local", password: "P@ssword123!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("access_token");
    expect(typeof res.body.access_token).toBe("string");
  });

  it("returns 400 when credentials are missing", async () => {
    const { AppError } = await import("../../src/utils/AppError.js");
    mockLoginUser.mockRejectedValueOnce(new AppError("invalid_input", 400));

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const { AppError } = await import("../../src/utils/AppError.js");
    mockLoginUser.mockRejectedValueOnce(new AppError("invalid_input", 400));

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: "P@ssword123!" });

    expect(res.status).toBe(400);
  });
});

describe("Integration – GET /api/v1/auth/csrf-token", () => {
  it("returns 200 with a csrfToken string", async () => {
    const res = await request(app).get("/api/v1/auth/csrf-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("csrfToken");
    expect(typeof res.body.csrfToken).toBe("string");
  });
});

describe("Integration – POST /api/v1/auth/logout", () => {
  it("returns 400 when no refresh token is provided", async () => {
    const res = await request(app)
      .post("/api/v1/auth/logout")
      .send({});

    // Without a refresh token cookie or body field, logout throws AppError 400
    expect(res.status).toBe(400);
  });
});
