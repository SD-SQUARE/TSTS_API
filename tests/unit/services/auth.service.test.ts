/**
 * Unit tests for auth.service.ts
 * Tests: generateCsrfToken, handleFailedAttempt, resetAttempts
 */

// Mock Redis before any imports
jest.mock("../../../src/database/redis.js", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    isOpen: true,
  },
}));

// Mock PostgresDataSource so entity repos don't open real DB connections
jest.mock("../../../src/database/postgres-data-source.js", () => ({
  PostgresDataSource: {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    }),
  },
}));

// Mock logger to suppress noise
jest.mock("../../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock i18next t() used inside the service
jest.mock("i18next", () => ({
  t: (key: string) => key,
}));

// Mock mailer, audit builder, jwt, and other heavy deps
jest.mock("../../../src/config/mailer.js", () => ({ sendMail: jest.fn() }));
jest.mock("../../../src/helpers/auditBuilder.js", () => ({
  audit: jest.fn().mockReturnValue({
    step: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    resource: jest.fn().mockReturnThis(),
    metadata: jest.fn().mockReturnThis(),
    summary: jest.fn().mockReturnThis(),
  }),
}));
jest.mock("../../../src/utils/jwt.js", () => ({
  generateToken: jest.fn().mockReturnValue("mock-token"),
  verifyToken: jest.fn(),
}));
jest.mock("../../../src/utils/secrets.js", () => ({
  comparePassword: jest.fn(),
  hashPassword: jest.fn(),
}));
jest.mock("../../../src/config/validations.js", () => ({
  PASSWORD_REGEX: /.+/,
}));

import { redisClient } from "../../../src/database/redis.js";
import {
  generateCsrfToken,
  handleFailedAttempt,
  resetAttempts,
} from "../../../src/services/auth.service.js";
import { AppError } from "../../../src/utils/AppError.js";

const mockRedis = redisClient as jest.Mocked<typeof redisClient>;

// Translator stub used by handleFailedAttempt
const fakeT = (key: string) => key;

describe("auth.service – generateCsrfToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateCsrfToken();
    expect(typeof token).toBe("string");
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  it("returns a different token on each call", () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });
});

describe("auth.service – handleFailedAttempt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("increments attempts counter and throws invalid_input on first failure", async () => {
    (mockRedis.get as jest.Mock).mockResolvedValueOnce(null); // 0 existing attempts
    (mockRedis.set as jest.Mock).mockResolvedValue("OK");

    await expect(handleFailedAttempt("user@example.com", fakeT)).rejects.toThrow(
      AppError
    );

    expect(mockRedis.set).toHaveBeenCalledWith(
      "login_attempts:user@example.com",
      "1",
      { EX: 3600 }
    );
  });

  it("increments from existing attempt count", async () => {
    (mockRedis.get as jest.Mock).mockResolvedValueOnce("3");
    (mockRedis.set as jest.Mock).mockResolvedValue("OK");

    await expect(handleFailedAttempt("user@example.com", fakeT)).rejects.toThrow(
      AppError
    );

    expect(mockRedis.set).toHaveBeenCalledWith(
      "login_attempts:user@example.com",
      "4",
      { EX: 3600 }
    );
  });

  it("throws account_locked on 5th failed attempt and sets lock key", async () => {
    (mockRedis.get as jest.Mock).mockResolvedValueOnce("4"); // 4 existing → new = 5
    (mockRedis.set as jest.Mock).mockResolvedValue("OK");

    let thrownError: AppError | null = null;
    try {
      await handleFailedAttempt("user@example.com", fakeT);
    } catch (e) {
      thrownError = e as AppError;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError).toBeInstanceOf(AppError);
    expect(thrownError!.message).toBe("account_locked");

    // Should set the lock key as well as the attempts counter
    const setCalls = (mockRedis.set as jest.Mock).mock.calls;
    const lockCall = setCalls.find((args: any[]) =>
      (args[0] as string).startsWith("lock_until:")
    );
    expect(lockCall).toBeDefined();
  });

  it("does not set lock key on fewer than 5 attempts", async () => {
    (mockRedis.get as jest.Mock).mockResolvedValueOnce("2");
    (mockRedis.set as jest.Mock).mockResolvedValue("OK");

    await expect(handleFailedAttempt("user@example.com", fakeT)).rejects.toThrow(
      AppError
    );

    const setCalls = (mockRedis.set as jest.Mock).mock.calls;
    const lockCall = setCalls.find((args: any[]) =>
      (args[0] as string).startsWith("lock_until:")
    );
    expect(lockCall).toBeUndefined();
  });
});

describe("auth.service – resetAttempts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes both the login_attempts and lock_until Redis keys", async () => {
    (mockRedis.del as jest.Mock).mockResolvedValue(1);

    await resetAttempts("user@example.com");

    expect(mockRedis.del).toHaveBeenCalledWith("login_attempts:user@example.com");
    expect(mockRedis.del).toHaveBeenCalledWith("lock_until:user@example.com");
    expect(mockRedis.del).toHaveBeenCalledTimes(2);
  });

  it("does not throw when keys do not exist (del returns 0)", async () => {
    (mockRedis.del as jest.Mock).mockResolvedValue(0);

    await expect(resetAttempts("nonexistent@example.com")).resolves.not.toThrow();
  });
});
