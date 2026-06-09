/**
 * Unit tests for apiKeyAuth middleware
 */

// Mock the api-keys service functions used by the middleware
jest.mock("../../../src/services/api-keys.service.js", () => ({
  extractApiKeyFromRequest: jest.fn(),
  validateApiKeyForRequest: jest.fn(),
}));

jest.mock("../../../src/database/postgres-data-source.js", () => ({
  PostgresDataSource: {
    getRepository: jest.fn().mockReturnValue({}),
  },
}));

import { apiKeyAuthMiddleware } from "../../../src/middleware/apiKeyAuth.js";
import {
  extractApiKeyFromRequest,
  validateApiKeyForRequest,
} from "../../../src/services/api-keys.service.js";

const mockExtract = extractApiKeyFromRequest as jest.Mock;
const mockValidate = validateApiKeyForRequest as jest.Mock;

// Helper to build mock Express req/res/next objects
const makeReq = (overrides: Record<string, any> = {}) => ({
  headers: {},
  method: "GET",
  originalUrl: "/api/v1/tickets",
  ip: "127.0.0.1",
  ...overrides,
});

const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("apiKeyAuthMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls next() without any side-effects when no API key header is present", async () => {
    mockExtract.mockReturnValue(null);

    const req = makeReq() as any;
    const res = makeRes();
    const next = jest.fn();

    await apiKeyAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockValidate).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it("calls next() without validating key for api-integrations management paths", async () => {
    mockExtract.mockReturnValue("tsts_live_abc123_somesecretkey");

    const req = makeReq({
      originalUrl: "/api/v1/api-integrations/keys",
    }) as any;
    const res = makeRes();
    const next = jest.fn();

    await apiKeyAuthMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it("sets req.user and req.apiKey on a valid API key and calls next()", async () => {
    const fakeApiKey = {
      id: "key-uuid-1",
      name: "Test Integration",
      keyPrefix: "abc123",
      zones: ["tickets"],
      methods: ["GET", "POST"],
    };
    const fakeZone = { key: "tickets" };

    mockExtract.mockReturnValue("tsts_live_abc123_somesecretkey");
    mockValidate.mockResolvedValue({ apiKey: fakeApiKey, zone: fakeZone });

    const req = makeReq() as any;
    const res = makeRes();
    const next = jest.fn();

    await apiKeyAuthMiddleware(req, res, next);

    expect(mockValidate).toHaveBeenCalledWith(
      "tsts_live_abc123_somesecretkey",
      "GET",
      "/api/v1/tickets",
      "127.0.0.1"
    );

    expect(next).toHaveBeenCalledTimes(1);

    // req.apiKey should be populated
    expect(req.apiKey).toMatchObject({
      id: "key-uuid-1",
      name: "Test Integration",
      keyPrefix: "abc123",
      activeZone: "tickets",
    });

    // req.user should be a synthetic SUPER_ADMIN user
    expect(req.user).toMatchObject({
      id: "key-uuid-1",
      role: expect.any(String),
    });
  });

  it("returns 401 when validateApiKeyForRequest throws an error", async () => {
    mockExtract.mockReturnValue("tsts_live_bad_key");
    const apiError = Object.assign(new Error("Invalid API key"), { statusCode: 401 });
    mockValidate.mockRejectedValue(apiError);

    const req = makeReq() as any;
    const res = makeRes();
    const next = jest.fn();

    await apiKeyAuthMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid API key" })
    );
  });

  it("defaults to 401 status when error has no statusCode", async () => {
    mockExtract.mockReturnValue("tsts_live_bad_key");
    mockValidate.mockRejectedValue(new Error("Something went wrong"));

    const req = makeReq() as any;
    const res = makeRes();
    const next = jest.fn();

    await apiKeyAuthMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("does NOT bypass validation for /api/v1/api-integrations/scope paths", async () => {
    const fakeApiKey = {
      id: "key-uuid-2",
      name: "Scope Key",
      keyPrefix: "def456",
      zones: ["tickets"],
      methods: ["GET"],
    };
    mockExtract.mockReturnValue("tsts_live_def456_somesecretkey");
    mockValidate.mockResolvedValue({ apiKey: fakeApiKey, zone: { key: "tickets" } });

    const req = makeReq({ originalUrl: "/api/v1/api-integrations/scope" }) as any;
    const res = makeRes();
    const next = jest.fn();

    await apiKeyAuthMiddleware(req, res, next);

    // Should validate (scope path is NOT a management path)
    expect(mockValidate).toHaveBeenCalled();
  });
});
