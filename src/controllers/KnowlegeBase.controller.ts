import { Request, Response } from "express";
import { KPRepo } from "../repositories/KnowlegeBaseRepo.js";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { KnowledgeBaseItemResponse } from "../interfaces/response/KnowledgeBaseItemResponse.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

const kpRepo = new KPRepo();
const repo = kpRepo.returnRepo();

type KnowledgeBasePayload = {
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  specialization_en?: string;
  specialization_ar?: string;
  content_en?: string;
  content_ar?: string;
};

const mapKnowledgeItemResponse = (
  item: KnowledgeItem,
): KnowledgeBaseItemResponse => ({
  id: item.id,
  title_en: item.title_en,
  title_ar: item.title_ar,
  description_en: item.description_en,
  description_ar: item.description_ar,
  specialization_en: item.specialization_en,
  specialization_ar: item.specialization_ar,
  content_en: item.content_en,
  content_ar: item.content_ar,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
});

const extractPayload = (body: Record<string, unknown>): KnowledgeBasePayload => ({
  title_en: typeof body.title_en === "string" ? body.title_en.trim() : undefined,
  title_ar: typeof body.title_ar === "string" ? body.title_ar.trim() : undefined,
  description_en:
    typeof body.description_en === "string"
      ? body.description_en.trim()
      : undefined,
  description_ar:
    typeof body.description_ar === "string"
      ? body.description_ar.trim()
      : undefined,
  specialization_en:
    typeof body.specialization_en === "string"
      ? body.specialization_en.trim()
      : undefined,
  specialization_ar:
    typeof body.specialization_ar === "string"
      ? body.specialization_ar.trim()
      : undefined,
  content_en:
    typeof body.content_en === "string" ? body.content_en.trim() : undefined,
  content_ar:
    typeof body.content_ar === "string" ? body.content_ar.trim() : undefined,
});

const hasAtLeastOneUpdate = (payload: KnowledgeBasePayload) =>
  Object.values(payload).some((value) => value !== undefined);

export const getKnowledgeBaseItems = async (req: Request, res: Response) => {
  const parsePositiveInt = (value: unknown) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const search =
    (req.query.search as string | undefined) ||
    (req.query.title_en as string | undefined) ||
    (req.query.title_ar as string | undefined) ||
    (req.query.description_en as string | undefined) ||
    (req.query.description_ar as string | undefined) ||
    (req.query.specialization_en as string | undefined) ||
    (req.query.specialization_ar as string | undefined) ||
    (req.query.content_en as string | undefined) ||
    (req.query.content_ar as string | undefined);
  const page = parsePositiveInt(req.query.page);
  const limit =
    parsePositiveInt(req.query.page_size) ||
    parsePositiveInt(req.query.limit);

  const auditLog = audit(req)
    .summary("Fetch knowledge base items")
    .action(AuditAction.GET_KNOWLEDGE_ITEMS)
    .metadata({ search, page, limit });

  const result = await KnowledgeItem.paginateAndSearch(repo, { search, page, limit });

  auditLog
    .step(`Knowledge base items fetched: ${result.items.length} items`)
    .metadata({ total: result.meta.total });

  logger.info(
    "[server][knowledgebase][controller] getKnowledgeItems request processed",
    { search, page, limit },
  );
  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const createKnowledgeBaseItem = async (
  req: Request,
  res: Response,
): Promise<Response<KnowledgeBaseItemResponse>> => {
  const payload = extractPayload(req.body);

  const auditLog = audit(req)
    .summary("Create knowledge base item")
    .action(AuditAction.CREATE_KNOWLEDGE_ITEM)
    .metadata(payload);

  if (
    !payload.title_en ||
    !payload.title_ar ||
    !payload.description_en ||
    !payload.description_ar ||
    !payload.specialization_en ||
    !payload.specialization_ar
  ) {
    auditLog.step("Missing required fields");
    logger.info(
      "[server][knowledgebase][controller] createKnowledgeItem missing required fields",
      { body: req.body },
    );
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message:
        "title_en, title_ar, description_en, description_ar, specialization_en, and specialization_ar are required.",
    });
  }

  const existingItem = await repo
    .createQueryBuilder("item")
    .where("item.deletedAt IS NULL")
    .andWhere("(item.title_en = :titleEn OR item.title_ar = :titleAr)", {
      titleEn: payload.title_en,
      titleAr: payload.title_ar,
    })
    .getOne();

  if (existingItem) {
    auditLog.step("Duplicate title detected");
    logger.info(
      "[server][knowledgebase][controller] createKnowledgeItem duplicate title",
      { title_en: payload.title_en, title_ar: payload.title_ar },
    );
    return res.status(ResponseStatus.CONFLICT).json({
      message: "A knowledge item with one of these titles already exists.",
    });
  }

  const newItem = repo.create({
    ...payload,
  });
  const savedItem = await repo.save(newItem);

  auditLog
    .step("Knowledge base item created successfully")
    .resource("knowledge_item", savedItem.id);

  logger.info(
    "[server][knowledgebase][controller] createKnowledgeItem request processed",
    { itemId: savedItem.id },
  );
  return res.status(ResponseStatus.CREATED).json(mapKnowledgeItemResponse(savedItem));
};

export const getKnowledgeBaseItemById = async (
  req: Request,
  res: Response,
): Promise<Response<KnowledgeBaseItemResponse>> => {
  const { id } = req.params;

  const auditLog = audit(req)
    .summary("Fetch knowledge base item by ID")
    .action(AuditAction.GET_KNOWLEDGE_ITEM_BY_ID)
    .metadata({ id });

  const item = await repo.findOne({ where: { id } });
  if (!item) {
    auditLog.step("Knowledge base item not found");
    logger.info(
      "[server][knowledgebase][controller] getKnowledgeItemById item not found",
      { itemId: id },
    );
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: "Knowledge item not found." });
  }

  auditLog
    .step("Knowledge base item fetched successfully")
    .resource("knowledge_item", item.id);

  logger.info(
    "[server][knowledgebase][controller] getKnowledgeItemById request processed",
    { itemId: id },
  );
  return res.status(ResponseStatus.SUCCESS).json(mapKnowledgeItemResponse(item));
};

export const updateKnowledgeBaseItem = async (
  req: Request,
  res: Response,
): Promise<Response<KnowledgeBaseItemResponse>> => {
  const { id } = req.params;
  const payload = extractPayload(req.body);

  const auditLog = audit(req)
    .summary("Update knowledge base item")
    .action(AuditAction.UPDATE_KNOWLEDGE_ITEM)
    .metadata({ itemId: id, newValue: payload });

  if (!hasAtLeastOneUpdate(payload)) {
    auditLog.step("No fields provided for update");
    logger.info(
      "[server][knowledgebase][controller] updateKnowledgeItem no fields to update",
      { itemId: id, body: req.body },
    );
    return res.status(ResponseStatus.BAD_REQUEST).json({
      message:
        "At least one bilingual field must be provided for update.",
    });
  }

  const item = await repo.findOne({ where: { id } });
  if (!item) {
    auditLog.step("Knowledge base item not found");
    logger.info(
      "[server][knowledgebase][controller] updateKnowledgeItem item not found",
      { itemId: id },
    );
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: "Knowledge item not found." });
  }

  if (
    (payload.title_en && payload.title_en !== item.title_en) ||
    (payload.title_ar && payload.title_ar !== item.title_ar)
  ) {
    const duplicate = await repo
      .createQueryBuilder("existing")
      .where("existing.deletedAt IS NULL")
      .andWhere("existing.id != :id", { id })
      .andWhere(
        "(existing.title_en = :titleEn OR existing.title_ar = :titleAr)",
        {
          titleEn: payload.title_en ?? item.title_en,
          titleAr: payload.title_ar ?? item.title_ar,
        },
      )
      .getOne();

    if (duplicate) {
      auditLog.step("Duplicate title detected");
      return res.status(ResponseStatus.CONFLICT).json({
        message: "A knowledge item with one of these titles already exists.",
      });
    }
  }

  auditLog.metadata({
    oldValue: {
      title_en: item.title_en,
      title_ar: item.title_ar,
      description_en: item.description_en,
      description_ar: item.description_ar,
      specialization_en: item.specialization_en,
      specialization_ar: item.specialization_ar,
      content_en: item.content_en,
      content_ar: item.content_ar,
    },
  });

  item.title_en = payload.title_en ?? item.title_en;
  item.title_ar = payload.title_ar ?? item.title_ar;
  item.description_en = payload.description_en ?? item.description_en;
  item.description_ar = payload.description_ar ?? item.description_ar;
  item.specialization_en =
    payload.specialization_en ?? item.specialization_en;
  item.specialization_ar =
    payload.specialization_ar ?? item.specialization_ar;
  item.content_en = payload.content_en ?? item.content_en;
  item.content_ar = payload.content_ar ?? item.content_ar;

  const updatedItem = await repo.save(item);

  auditLog
    .step("Knowledge base item updated successfully")
    .resource("knowledge_item", updatedItem.id);

  logger.info(
    "[server][knowledgebase][controller] updateKnowledgeItem request processed",
    { itemId: id },
  );
  return res.status(ResponseStatus.SUCCESS).json(mapKnowledgeItemResponse(updatedItem));
};

export const deleteKnowledgeBaseItem = async (req: Request, res: Response) => {
  const { id } = req.params;

  const auditLog = audit(req)
    .summary("Delete knowledge base item")
    .action(AuditAction.DELETE_KNOWLEDGE_ITEM)
    .metadata({ itemId: id });

  const item = await repo.findOne({ where: { id } });
  if (!item) {
    auditLog.step("Knowledge base item not found");
    logger.info(
      "[server][knowledgebase][controller] deleteKnowledgeItem item not found",
      { itemId: id },
    );
    return res
      .status(ResponseStatus.NOT_FOUND)
      .json({ message: "Knowledge item not found." });
  }

  await repo.softRemove(item);

  auditLog
    .step("Knowledge base item deleted successfully")
    .resource("knowledge_item", item.id);

  logger.info(
    "[server][knowledgebase][controller] deleteKnowledgeItem request processed",
    { itemId: id },
  );
  return res.status(ResponseStatus.SUCCESS).send({
    success: true,
    message: "Knowledge item deleted successfully.",
  });
};
