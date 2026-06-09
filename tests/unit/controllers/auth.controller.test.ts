/**
 * Unit tests for auth.controller – getCsrfToken
 */

// Mock heavy service/DB deps so the controller module can be imported
jest.mock("../../../src/services/auth.service.js", () => ({
  loginUser: jest.fn(),
  logoutUser: jest.fn(),
  generateCsrfForUser: jest.fn(),
  getRefreshTokenById: jest.fn(),
  forgetPassword: jest.fn(),
  verifyOtp: jest.fn(),
  resetPassword: jest.fn(),
}));

jest.mock("../../../src/database/postgres-data-source.js", () => ({
  PostgresDataSource: {
    getRepository: jest.fn().mockReturnValue({}),
  },
}));

jest.mock("../../../src/database/redis.js", () => ({
  redisClient: { get: jest.fn(), set: jest.fn(), del: jest.fn(), isOpen: true },
}));

jest.mock("../../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("../../../src/helpers/auditBuilder.js", () => ({
  audit: jest.fn().mockReturnValue({
    step: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    resource: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockReturnThis(),
    summary: jest.fn().mockReturnThis(),
  }),
}));

jest.mock("i18next", () => ({
  t: (key: string) => key,
}));

import { getCsrfToken } from "../../../src/controllers/auth.controller.js";

// Helpers for building mock req/res
const makeReq = (overrides: Record<string, any> = {}) => ({
  cookies: {},
  body: {},
  headers: {},
  ...overrides,
});

const makeRes = () => {
  const captured: { body?: any } = {};
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation((body: any) => {
    captured.body = body;
    return res;
  });
  res._captured = captured;
  return res;
};

describe("auth.controller – getCsrfToken", () => {
  it("returns an object with a csrfToken property", () => {
    const req = makeReq();
    const res = makeRes();

    getCsrfToken(req, res);

    expect(res.json).toHaveBeenCalledTimes(1);
    const body = res._captured.body;
    expect(body).toHaveProperty("csrfToken");
  });

  it("returns a 48-character hex string when req.csrfToken is not a function", () => {
    const req = makeReq({ csrfToken: undefined });
    const res = makeRes();

    getCsrfToken(req, res);

    const { csrfToken } = res._captured.body;
    expect(typeof csrfToken).toBe("string");
    // crypto.randomBytes(24).toString('hex') → 48 hex chars
    expect(csrfToken).toHaveLength(48);
    expect(/^[0-9a-f]{48}$/.test(csrfToken)).toBe(true);
  });

  it("uses req.csrfToken() when it is a function (csurf-style)", () => {
    const expectedToken = "csurf-generated-token-abc";
    const req = makeReq({ csrfToken: () => expectedToken });
    const res = makeRes();

    getCsrfToken(req, res);

    const { csrfToken } = res._captured.body;
    expect(csrfToken).toBe(expectedToken);
  });

  it("does not throw when req.csrfToken is undefined", () => {
    const req = makeReq({ csrfToken: undefined });
    const res = makeRes();

    expect(() => getCsrfToken(req, res)).not.toThrow();
  });

  it("generates unique tokens on consecutive calls", () => {
    const res1 = makeRes();
    const res2 = makeRes();

    getCsrfToken(makeReq(), res1);
    getCsrfToken(makeReq(), res2);

    const token1 = res1._captured.body.csrfToken;
    const token2 = res2._captured.body.csrfToken;

    // Very unlikely to collide with 24 random bytes
    expect(token1).not.toBe(token2);
  });
});
