import { NextFunction, Request, Response } from "express";
import { UserType } from "../enums/UserType.enum.js";
import {
  extractApiKeyFromRequest,
  validateApiKeyForRequest,
} from "../services/api-keys.service.js";

const isApiIntegrationManagementPath = (requestPath: string) =>
  requestPath.startsWith("/api/v1/api-integrations") &&
  !requestPath.startsWith("/api/v1/api-integrations/scope");

export const apiKeyAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const rawKey = extractApiKeyFromRequest(req);
  if (!rawKey || isApiIntegrationManagementPath(req.originalUrl)) {
    return next();
  }

  try {
    const { apiKey, zone } = await validateApiKeyForRequest(
      rawKey,
      req.method,
      req.originalUrl,
      req.ip,
    );

    req.apiKey = {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      zones: apiKey.zones ?? [],
      methods: apiKey.methods ?? [],
      activeZone: zone.key,
    };

    req.user = {
      id: apiKey.id,
      email: `api-key-${apiKey.keyPrefix}@tsts.local`,
      role: UserType.SUPER_ADMIN,
      permission_profile: {},
      permissions: ["api_integrations.external"],
      name: {
        first: { en: apiKey.name, ar: apiKey.name },
        last: { en: "API Key", ar: "API Key" },
      },
    };

    return next();
  } catch (error: any) {
    return res
      .status(error?.statusCode ?? 401)
      .json({ message: error?.message ?? "Invalid API key" });
  }
};
