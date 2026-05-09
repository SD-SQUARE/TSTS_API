import { Request, Response } from "express";
import { t } from "i18next";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {
  listDeletedRecords,
  listSoftDeleteEntities,
  restoreDeletedRecord,
  updateDeletedRecord,
} from "../services/recycle-bin.service.js";

export const listRecycleEntitiesController = async (_req: Request, res: Response) =>
  res.status(ResponseStatus.SUCCESS).json({ entities: listSoftDeleteEntities() });

export const listDeletedRecordsController = async (req: Request, res: Response) => {
  const result = await listDeletedRecords(req.params.entity);
  if (!result) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message: t("entity_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const restoreDeletedRecordController = async (
  req: Request,
  res: Response,
) => {
  const restored = await restoreDeletedRecord(req.params.entity, req.params.id);
  if (!restored) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message: t("entity_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json({ is_restored: true });
};

export const updateDeletedRecordController = async (
  req: Request,
  res: Response,
) => {
  const result = await updateDeletedRecord(req.params.entity, req.params.id, req.body);
  if (!result) {
    return res.status(ResponseStatus.NOT_FOUND).json({ message: t("entity_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(result);
};
