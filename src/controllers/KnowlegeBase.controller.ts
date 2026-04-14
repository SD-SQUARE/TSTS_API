import { KPRepo } from "../repositories/KnowlegeBaseRepo.js";
import e, { Request, Response } from "express";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { KnowledgeBaseItemResponse } from "../interfaces/response/KnowledgeBaseItemResponse.js";
import { buildName } from "../utils/handleNamaAndDesc.js";
import { buildDescription } from "../utils/handleNamaAndDesc.js";

const kpRepo = new KPRepo();
const repo = kpRepo.returnRepo();

export const getKnowledgeBaseItems = async (req: Request, res: Response) => {
  const search =
    (req.query.search as string | undefined) ||
    (req.query.title as string | undefined) ||
    (req.query.description as string | undefined) ||
    (req.query.specialization as string | undefined) ||
    (req.query.content as string | undefined);

  const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
  const page_size = req.query.page_size ? parseInt(req.query.page_size as string, 10) : undefined;

  const result = await KnowledgeItem.paginateAndSearch(repo, {
    search,
    page,
    page_size
  });

  logger.info("[server][knowledgebase][controller] getKnowledgeItems request processed", {
    search,
    page,
    page_size
  });

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const createKnowledgeBaseItem = async (
  req: Request,
  res: Response
): Promise<Response<KnowledgeBaseItemResponse>> => {
  const { title_en, title_ar, description_en, description_ar, specialization_en, specialization_ar, content_en, content_ar } = req.body;


  const title = buildName({en: title_en, ar: title_ar});
  const description = buildName({en: description_en, ar: description_ar});
  const specialization = buildName({en: specialization_en, ar: specialization_ar});
  const content =  buildDescription({ en: content_en, ar: content_ar })  ;
  

  const existingItem = await repo
    .createQueryBuilder("item")
    .where("item.title ->> 'en' = :en", { en: title.en })
    .orWhere("item.title ->> 'ar' = :ar", { ar: title.ar })
    .getOne();

  if (existingItem) {
    logger.info("[server][knowledgebase][controller] createKnowledgeItem duplicate title", {
      title,
    });

    return res.status(ResponseStatus.CONFLICT).json({
      message: "A knowledge item with this title already exists.",
    });
  }

  const newItem = repo.create({
    title,
    description,
    specialization,
    content,
  });

  const savedItem = await repo.save(newItem);

  const result: KnowledgeBaseItemResponse = {
    id: savedItem.id,
    title: savedItem.title,
    description: savedItem.description,
    specialization: savedItem.specialization,
    content: savedItem.content,
    createdAt: savedItem.createdAt,
    updatedAt: savedItem.updatedAt,
  };

  logger.info("[server][knowledgebase][controller] createKnowledgeItem request processed", {
    itemId: savedItem.id,
  });

  return res.status(ResponseStatus.CREATED).json(result);
};

export const getKnowledgeBaseItemById = async (
  req: Request,
  res: Response
): Promise<Response<KnowledgeBaseItemResponse>> => {
  const { id } = req.params;

  const item = await repo.findOne({ where: { id } });

  if (!item) {
    logger.info("[server][knowledgebase][controller] getKnowledgeItemById item not found", {
      itemId: id,
    });

    return res.status(ResponseStatus.NOT_FOUND).json({
      message: "Knowledge item not found.",
    });
  }

  const result: KnowledgeBaseItemResponse = {
    id: item.id,
    title: item.title,
    description: item.description,
    specialization: item.specialization,
    content: item.content,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };

  logger.info("[server][knowledgebase][controller] getKnowledgeItemById request processed", {
    itemId: id,
  });

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const updateKnowledgeBaseItem = async (
  req: Request,
  res: Response
): Promise<Response<KnowledgeBaseItemResponse>> => {
  const { id } = req.params;
  const { title_en, title_ar, description_en, description_ar, specialization_en, specialization_ar, content_en, content_ar } = req.body;

  const title = title_en || title_ar ? buildName({ en: title_en, ar: title_ar }) : undefined;
  const description = description_en || description_ar ? buildName({ en: description_en, ar: description_ar }) : undefined;
  const specialization = specialization_en || specialization_ar ? buildName({ en: specialization_en, ar: specialization_ar }) : undefined;
  const content = content_en || content_ar ? buildDescription({ en: content_en, ar: content_ar }) : undefined;

  if (!title && !description && !specialization && !content) {
    logger.info("[server][knowledgebase][controller] updateKnowledgeItem no fields to update", {
      itemId: id,
      body: req.body,
    });

    return res.status(ResponseStatus.BAD_REQUEST).json({
      message:
        "At least one field (title, description, specialization, content) must be provided for update.",
    });
  }

  const item = await repo.findOne({ where: { id } });

  if (!item) {
    logger.info("[server][knowledgebase][controller] updateKnowledgeItem item not found", {
      itemId: id,
    });

    return res.status(ResponseStatus.NOT_FOUND).json({
      message: "Knowledge item not found.",
    });
  }

  if (title) {
    item.title = {
      ...item.title,
      ...title,
    };
  }

  if (description) {
    item.description = {
      ...item.description,
      ...description,
    };
  }

  if (specialization) {
    item.specialization = {
      ...item.specialization,
      ...specialization,
    };
  }

  if (content) {
    item.content = {
      ...item.content,
      ...content,
    };
  }

  const updatedItem = await repo.save(item);

  const result: KnowledgeBaseItemResponse = {
    id: updatedItem.id,
    title: updatedItem.title,
    description: updatedItem.description,
    specialization: updatedItem.specialization,
    content: updatedItem.content,
    createdAt: updatedItem.createdAt,
    updatedAt: updatedItem.updatedAt,
  };

  logger.info("[server][knowledgebase][controller] updateKnowledgeItem request processed", {
    itemId: id,
  });

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const deleteKnowledgeBaseItem = async (req: Request, res: Response) => {
  const { id } = req.params;

  const item = await repo.findOne({ where: { id } });

  if (!item) {
    logger.info("[server][knowledgebase][controller] deleteKnowledgeItem item not found", {
      itemId: id,
    });

    return res.status(ResponseStatus.NOT_FOUND).json({
      message: "Knowledge item not found.",
    });
  }

  await repo.softRemove(item);

  logger.info("[server][knowledgebase][controller] deleteKnowledgeItem request processed", {
    itemId: id,
  });

  return res.status(ResponseStatus.SUCCESS).send({
    success: true,
    message: "Knowledge item deleted successfully.",
  });
};