import { Request, Response } from "express";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {
  API_KEY_METHODS,
  API_KEY_ZONES,
  createApiKey,
  extractApiKeyFromRequest,
  getApiKeyScopeByRawKey,
  listApiKeys,
  revokeApiKey,
  updateApiKey,
} from "../services/api-keys.service.js";

export const getApiKeyMetaController = async (_req: Request, res: Response) => {
  return res.status(ResponseStatus.SUCCESS).json({
    zones: API_KEY_ZONES,
    methods: API_KEY_METHODS,
  });
};

export const listApiKeysController = async (_req: Request, res: Response) => {
  return res.status(ResponseStatus.SUCCESS).json({
    keys: await listApiKeys(),
  });
};

export const createApiKeyController = async (req: Request, res: Response) => {
  const result = await createApiKey(req.body, req.user?.id ?? null);
  return res.status(ResponseStatus.CREATED).json(result);
};

export const updateApiKeyController = async (req: Request, res: Response) => {
  const updated = await updateApiKey(req.params.id, req.body);
  if (!updated) {
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: "API key not found" });
  }

  return res.status(ResponseStatus.SUCCESS).json(updated);
};

export const revokeApiKeyController = async (req: Request, res: Response) => {
  const revoked = await revokeApiKey(req.params.id);
  if (!revoked) {
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: "API key not found" });
  }

  return res.status(ResponseStatus.SUCCESS).json({ is_revoked: true });
};

export const getApiKeyScopeController = async (req: Request, res: Response) => {
  const rawKey = extractApiKeyFromRequest(req);
  if (!rawKey) {
    return res
      .status(ResponseStatus.UNAUTHORIZED)
      .json({ message: "API key is required" });
  }

  return res
    .status(ResponseStatus.SUCCESS)
    .json(await getApiKeyScopeByRawKey(rawKey, req.ip));
};
