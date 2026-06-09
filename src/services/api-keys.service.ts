import crypto from "crypto";
import { Request } from "express";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { ApiKey } from "../entities/ApiKey.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { AppError } from "../utils/AppError.js";

const apiKeyRepo = PostgresDataSource.getRepository(ApiKey);

export const API_KEY_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export const API_KEY_ZONES = [
  {
    key: "tickets",
    label: "Tickets",
    description: "Create, read, and update ticket data.",
    paths: ["/api/v1/tickets"],
  },
  {
    key: "knowledge_base",
    label: "Knowledge Base",
    description: "Read and manage knowledge base articles.",
    paths: ["/api/v1/knowledge-base"],
  },
  {
    key: "custom_forms",
    label: "Custom Forms",
    description: "Read and manage custom forms and responses.",
    paths: ["/api/v1/custom-forms"],
  },
  {
    key: "reports",
    label: "Reports",
    description: "Read generated operational reports.",
    paths: ["/api/v1/reports"],
  },
  {
    key: "lookups",
    label: "Lookups",
    description: "Read operational lookup data used by integrations.",
    paths: [
      "/api/v1/lookups",
      "/api/v1/universities",
      "/api/v1/domains",
      "/api/v1/departments",
      "/api/v1/specializations",
      "/api/v1/problems",
      "/api/v1/sla-rules",
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    description: "Read and update notification data.",
    paths: ["/api/v1/notifications"],
  },
] as const;

export type ApiKeyZoneKey = (typeof API_KEY_ZONES)[number]["key"];
export type ApiKeyMethod = (typeof API_KEY_METHODS)[number];

export interface ApiKeyPayload {
  name: string;
  description?: string | null;
  zones: string[];
  methods: string[];
  expiresAt?: string | Date | null;
  isActive?: boolean;
}

export interface ApiKeyValidationResult {
  apiKey: ApiKey;
  zone: (typeof API_KEY_ZONES)[number];
}

const API_KEY_PREFIX_PATTERN = /^tsts_live_([a-f0-9]{10})_[A-Za-z0-9_-]{20,}$/;

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export const normalizeApiKeyMethods = (methods: unknown): ApiKeyMethod[] => {
  const allowed = new Set<string>(API_KEY_METHODS);
  return Array.from(
    new Set(
      normalizeStringArray(methods)
        .map((method) => method.trim().toUpperCase())
        .filter((method) => allowed.has(method)),
    ),
  ) as ApiKeyMethod[];
};

export const normalizeApiKeyZones = (zones: unknown): ApiKeyZoneKey[] => {
  const allowed = new Set(API_KEY_ZONES.map((zone) => zone.key));
  return Array.from(
    new Set(
      normalizeStringArray(zones)
        .map((zone) => zone.trim())
        .filter((zone): zone is ApiKeyZoneKey => allowed.has(zone as ApiKeyZoneKey)),
    ),
  );
};

const parseOptionalDate = (value: ApiKeyPayload["expiresAt"]) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError("Invalid API key expiration date", ResponseStatus.BAD_REQUEST);
  }
  return date;
};

const hashApiKey = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const generateRawApiKey = () => {
  const prefix = crypto.randomBytes(5).toString("hex");
  const secret = crypto.randomBytes(32).toString("base64url");
  return {
    key: `tsts_live_${prefix}_${secret}`,
    prefix,
  };
};

const extractPrefix = (rawKey: string) => {
  const match = rawKey.trim().match(API_KEY_PREFIX_PATTERN);
  return match?.[1] ?? null;
};

export const extractApiKeyFromRequest = (req: Request) => {
  const directHeader = req.get("x-api-key");
  if (directHeader?.trim()) return directHeader.trim();

  const authorization = req.get("authorization");
  if (!authorization) return null;

  const [scheme, ...rest] = authorization.split(" ");
  if (!["apikey", "api-key"].includes(scheme.toLowerCase())) return null;

  const key = rest.join(" ").trim();
  return key || null;
};

export const hasApiKeyHeader = (req: Request) => Boolean(extractApiKeyFromRequest(req));

const isExpired = (apiKey: ApiKey) =>
  Boolean(apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now());

const getRequestPathname = (requestPath: string) => {
  try {
    return new URL(requestPath, "http://tsts.local").pathname;
  } catch {
    return requestPath.split("?")[0] || requestPath;
  }
};

export const getApiKeyZoneForPath = (requestPath: string) => {
  const pathname = getRequestPathname(requestPath);
  return API_KEY_ZONES.find((zone) =>
    zone.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
  );
};

const findApiKeyByRawKey = async (rawKey: string) => {
  const keyPrefix = extractPrefix(rawKey);
  if (!keyPrefix) return null;

  return apiKeyRepo.findOne({
    where: {
      keyPrefix,
      keyHash: hashApiKey(rawKey.trim()),
    },
  });
};

const ensureApiKeyUsable = (apiKey: ApiKey | null) => {
  if (!apiKey) {
    throw new AppError("Invalid API key", ResponseStatus.UNAUTHORIZED);
  }

  if (!apiKey.isActive || isExpired(apiKey)) {
    throw new AppError("API key is not active", ResponseStatus.FORBIDDEN);
  }

  return apiKey;
};

const touchApiKeyUsage = async (apiKey: ApiKey, ip?: string | null) => {
  apiKey.lastUsedAt = new Date();
  apiKey.lastUsedIp = ip ? ip.slice(0, 80) : null;
  await apiKeyRepo.save(apiKey);
};

export const mapApiKeyDto = (apiKey: ApiKey) => ({
  id: apiKey.id,
  name: apiKey.name,
  description: apiKey.description ?? null,
  keyPrefix: apiKey.keyPrefix,
  zones: apiKey.zones ?? [],
  methods: apiKey.methods ?? [],
  isActive: apiKey.isActive,
  expiresAt: apiKey.expiresAt ?? null,
  lastUsedAt: apiKey.lastUsedAt ?? null,
  lastUsedIp: apiKey.lastUsedIp ?? null,
  createdById: apiKey.createdById ?? null,
  createdAt: apiKey.createdAt,
  updatedAt: apiKey.updatedAt,
});

export const listApiKeys = async () => {
  const rows = await apiKeyRepo.find({
    order: { createdAt: "DESC" },
  });

  return rows.map(mapApiKeyDto);
};

export const createApiKey = async (
  payload: ApiKeyPayload,
  createdById?: string | null,
) => {
  const name = payload.name?.trim();
  if (!name) {
    throw new AppError("API key name is required", ResponseStatus.BAD_REQUEST);
  }

  const zones = normalizeApiKeyZones(payload.zones);
  const methods = normalizeApiKeyMethods(payload.methods);

  if (!zones.length) {
    throw new AppError("At least one API key zone is required", ResponseStatus.BAD_REQUEST);
  }

  if (!methods.length) {
    throw new AppError("At least one API key method is required", ResponseStatus.BAD_REQUEST);
  }

  let generated = generateRawApiKey();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing = await apiKeyRepo.findOne({
      where: { keyPrefix: generated.prefix },
      withDeleted: true,
    } as any);
    if (!existing) break;
    generated = generateRawApiKey();
  }

  const saved = await apiKeyRepo.save(
    apiKeyRepo.create({
      name,
      description: payload.description?.trim() || null,
      keyPrefix: generated.prefix,
      keyHash: hashApiKey(generated.key),
      zones,
      methods,
      isActive: payload.isActive !== false,
      expiresAt: parseOptionalDate(payload.expiresAt),
      createdById: createdById ?? null,
    }),
  );

  return {
    key: generated.key,
    apiKey: mapApiKeyDto(saved),
  };
};

export const updateApiKey = async (id: string, payload: Partial<ApiKeyPayload>) => {
  const apiKey = await apiKeyRepo.findOne({ where: { id } });
  if (!apiKey) return null;

  if (typeof payload.name === "string") {
    const name = payload.name.trim();
    if (!name) {
      throw new AppError("API key name is required", ResponseStatus.BAD_REQUEST);
    }
    apiKey.name = name;
  }

  if ("description" in payload) {
    apiKey.description = payload.description?.trim() || null;
  }

  if ("zones" in payload) {
    const zones = normalizeApiKeyZones(payload.zones);
    if (!zones.length) {
      throw new AppError("At least one API key zone is required", ResponseStatus.BAD_REQUEST);
    }
    apiKey.zones = zones;
  }

  if ("methods" in payload) {
    const methods = normalizeApiKeyMethods(payload.methods);
    if (!methods.length) {
      throw new AppError("At least one API key method is required", ResponseStatus.BAD_REQUEST);
    }
    apiKey.methods = methods;
  }

  if ("expiresAt" in payload) {
    apiKey.expiresAt = parseOptionalDate(payload.expiresAt);
  }

  if (typeof payload.isActive === "boolean") {
    apiKey.isActive = payload.isActive;
  }

  return mapApiKeyDto(await apiKeyRepo.save(apiKey));
};

export const revokeApiKey = async (id: string) => {
  const apiKey = await apiKeyRepo.findOne({ where: { id } });
  if (!apiKey) return false;

  apiKey.isActive = false;
  await apiKeyRepo.save(apiKey);
  await apiKeyRepo.softRemove(apiKey);
  return true;
};

export const validateApiKeyForRequest = async (
  rawKey: string,
  method: string,
  requestPath: string,
  ip?: string | null,
): Promise<ApiKeyValidationResult> => {
  const apiKey = ensureApiKeyUsable(await findApiKeyByRawKey(rawKey));
  const zone = getApiKeyZoneForPath(requestPath);

  if (!zone || !apiKey.zones?.includes(zone.key)) {
    throw new AppError("API key is not allowed for this zone", ResponseStatus.FORBIDDEN);
  }

  const normalizedMethod = method.toUpperCase();
  if (!apiKey.methods?.includes(normalizedMethod)) {
    throw new AppError("API key is not allowed for this method", ResponseStatus.FORBIDDEN);
  }

  await touchApiKeyUsage(apiKey, ip);
  return { apiKey, zone };
};

export const getApiKeyScopeByRawKey = async (
  rawKey: string,
  ip?: string | null,
) => {
  const apiKey = ensureApiKeyUsable(await findApiKeyByRawKey(rawKey));
  await touchApiKeyUsage(apiKey, ip);

  const zoneKeys = new Set(apiKey.zones ?? []);
  return {
    apiKey: mapApiKeyDto(apiKey),
    zones: API_KEY_ZONES.filter((zone) => zoneKeys.has(zone.key)),
    methods: apiKey.methods ?? [],
  };
};
