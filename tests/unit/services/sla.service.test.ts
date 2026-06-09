/**
 * Unit tests for sla.service.ts
 * Tests: getTicketSlaStateFromRules (pure logic, no mocks needed for the tested fn)
 */

// Mock DB and Redis so module-level repo initialization doesn't fail
jest.mock("../../../src/database/postgres-data-source.js", () => ({
  PostgresDataSource: {
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      softRemove: jest.fn(),
    }),
  },
}));

jest.mock("../../../src/database/redis.js", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
    isOpen: true,
  },
}));

jest.mock("../../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock("../../../src/services/tickets/ticket-cache.service.js", () => ({
  invalidateTicketAnalyticsCache: jest.fn().mockResolvedValue(undefined),
  readJsonCache: jest.fn().mockResolvedValue(null),
  writeJsonCache: jest.fn().mockResolvedValue(undefined),
}));

import { getTicketSlaStateFromRules } from "../../../src/services/sla.service.js";

// ------------------------------------------------------------------
// Helpers to build lightweight test stubs
// ------------------------------------------------------------------

type SlaRuleSnapshot = {
  id: string;
  name?: { en?: string; ar?: string };
  maxHours: number;
  universityId: string | null;
  domainId: string | null;
  specializationId: string | null;
  problemId: string | null;
};

const makeTicket = (overrides: Partial<{
  createdAt: Date;
  requester: any;
  specialization: any;
  problem: any;
}> = {}): any => ({
  createdAt: new Date(),
  requester: null,
  specialization: null,
  problem: null,
  ...overrides,
});

const makeRule = (overrides: Partial<SlaRuleSnapshot> = {}): SlaRuleSnapshot => ({
  id: "rule-1",
  name: { en: "Default Rule" },
  maxHours: 24,
  universityId: null,
  domainId: null,
  specializationId: null,
  problemId: null,
  ...overrides,
});

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe("sla.service – getTicketSlaStateFromRules", () => {
  it("returns { violated: false } when rules array is empty", async () => {
    const ticket = makeTicket();
    const result = await getTicketSlaStateFromRules(ticket, "en", []);
    expect(result).toEqual({ violated: false });
  });

  it("returns { violated: false } when ticket has no createdAt", async () => {
    const ticket = makeTicket({ createdAt: undefined as any });
    const result = await getTicketSlaStateFromRules(ticket, "en", [makeRule()]);
    expect(result).toEqual({ violated: false });
  });

  it("matches a catch-all rule (no criteria set) for any ticket", async () => {
    const ticket = makeTicket({
      createdAt: new Date(Date.now() - 5 * 3600_000), // 5 hours old
    });
    const rule = makeRule({ maxHours: 24 });

    const result = await getTicketSlaStateFromRules(ticket, "en", [rule]);

    expect(result.violated).toBe(false);
    expect(result.ruleId).toBe("rule-1");
    expect(result.maxHours).toBe(24);
    expect(typeof result.ageHours).toBe("number");
  });

  it("violated = true when ageHours > maxHours", async () => {
    const ticket = makeTicket({
      createdAt: new Date(Date.now() - 30 * 3600_000), // 30 hours old
    });
    const rule = makeRule({ maxHours: 24 });

    const result = await getTicketSlaStateFromRules(ticket, "en", [rule]);

    expect(result.violated).toBe(true);
    expect(result.ageHours).toBeGreaterThan(24);
  });

  it("violated = false when ageHours < maxHours", async () => {
    const ticket = makeTicket({
      createdAt: new Date(Date.now() - 2 * 3600_000), // 2 hours old
    });
    const rule = makeRule({ maxHours: 8 });

    const result = await getTicketSlaStateFromRules(ticket, "en", [rule]);

    expect(result.violated).toBe(false);
    expect(result.ageHours).toBeLessThan(8);
  });

  it("prefers more specific rule (all 4 criteria set) over catch-all", async () => {
    const UNI_ID = "uni-1";
    const DOM_ID = "dom-1";
    const SPEC_ID = "spec-1";
    const PROB_ID = "prob-1";

    const ticket = makeTicket({
      createdAt: new Date(Date.now() - 10 * 3600_000), // 10 hours old
      requester: {
        university: { id: UNI_ID },
        domain: { id: DOM_ID },
      },
      specialization: { id: SPEC_ID },
      problem: { id: PROB_ID },
    });

    const catchAll = makeRule({ id: "catch-all", maxHours: 6 }); // would violate
    const specific = makeRule({
      id: "specific",
      maxHours: 48, // plenty of time → not violated
      universityId: UNI_ID,
      domainId: DOM_ID,
      specializationId: SPEC_ID,
      problemId: PROB_ID,
    });

    const result = await getTicketSlaStateFromRules(ticket, "en", [catchAll, specific]);

    // The specific rule should win; with 48h max and only 10h age → not violated
    expect(result.ruleId).toBe("specific");
    expect(result.violated).toBe(false);
    expect(result.maxHours).toBe(48);
  });

  it("falls through to no-match when university filter does not match", async () => {
    const ticket = makeTicket({
      createdAt: new Date(Date.now() - 10 * 3600_000),
      requester: { university: { id: "uni-A" }, domain: null },
    });

    // Rule is specific to a different university
    const rule = makeRule({ universityId: "uni-B", maxHours: 4 });

    const result = await getTicketSlaStateFromRules(ticket, "en", [rule]);

    // No matching rule → returns ageHours but no ruleId
    expect(result.violated).toBe(false);
    expect((result as any).ruleId).toBeUndefined();
    expect(typeof result.ageHours).toBe("number");
  });

  it("includes ageHours rounded to 2 decimal places in result", async () => {
    const ticket = makeTicket({
      createdAt: new Date(Date.now() - 1.5 * 3600_000),
    });
    const rule = makeRule({ maxHours: 10 });

    const result = await getTicketSlaStateFromRules(ticket, "en", [rule]);

    // ageHours should be about 1.5 and have at most 2 decimal places
    const decimals = result.ageHours?.toString().split(".")[1]?.length ?? 0;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it("uses Arabic rule name when lang='ar'", async () => {
    const ticket = makeTicket({
      createdAt: new Date(Date.now() - 2 * 3600_000),
    });
    const rule = makeRule({ name: { en: "Default Rule", ar: "قاعدة افتراضية" } });

    const result = await getTicketSlaStateFromRules(ticket, "ar", [rule]);

    expect(result.ruleName).toBe("قاعدة افتراضية");
  });
});
