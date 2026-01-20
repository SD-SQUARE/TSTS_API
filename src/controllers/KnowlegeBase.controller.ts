import { KPRepo } from "../repositories/KnowlegeBaseRepo.js";
import { Request, Response } from "express";
import { KnowledgeItem } from "../entities/KnowledgeItem.js";
import logger from "../utils/logger.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { KnowledgeBaseItemResponse } from "../interfaces/response/KnowledgeBaseItemResponse.js";
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
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await KnowledgeItem.paginateAndSearch(repo, { search, page, limit });
    logger.info("[server][knowledgebase][controller] getKnowledgeItems request processed", { search, page, limit });
    return res.status(ResponseStatus.SUCCESS).json(result);
};
export const createKnowledgeBaseItem = async (req: Request, res: Response): Promise<Response<KnowledgeBaseItemResponse>> => {
    const { title, description, specialization, content } = req.body;
    if (!title || !description || !specialization) {
        logger.info("[server][knowledgebase][controller] createKnowledgeItem missing required fields", { body: req.body });
        return res.status(ResponseStatus.BAD_REQUEST).json({ message: "Title, description, and specialization are required." });
    }
    const existingItem = await repo.findOne({ where: { title } });
    if (existingItem) {
        logger.info("[server][knowledgebase][controller] createKnowledgeItem duplicate title", { title });
        return res.status(ResponseStatus.CONFLICT).json({ message: "A knowledge item with this title already exists." });
    }
    const newItem = repo.create({ title, description, specialization, content });
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

    logger.info("[server][knowledgebase][controller] createKnowledgeItem request processed", { itemId: savedItem.id });
    return res.status(ResponseStatus.CREATED).json(result);
}
export const getKnowledgeBaseItemById = async (req: Request, res: Response): Promise<Response<KnowledgeBaseItemResponse>> =>{
    const { id } = req.params;
    const item = await repo.findOne({ where: { id } });
    if (!item) {
        logger.info("[server][knowledgebase][controller] getKnowledgeItemById item not found", { itemId: id });
        return res.status(ResponseStatus.NOT_FOUND).json({ message: "Knowledge item not found." });
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
    logger.info("[server][knowledgebase][controller] getKnowledgeItemById request processed", { itemId: id });
    return res.status(ResponseStatus.SUCCESS).json(result);
}
export const updateKnowledgeBaseItem = async (req: Request, res: Response): Promise<Response<KnowledgeBaseItemResponse>> => {
    const { id } = req.params;
    const { title, description, specialization, content } = req.body;
    if (!title && !description && !specialization && !content) {
        logger.info("[server][knowledgebase][controller] updateKnowledgeItem no fields to update", { itemId: id, body: req.body });
        return res.status(ResponseStatus.BAD_REQUEST).json({ message: "At least one field (title, description, specialization, content) must be provided for update." });
    }
    const item = await repo.findOne({ where: { id } });
    if (!item) {
        logger.info("[server][knowledgebase][controller] updateKnowledgeItem item not found", { itemId: id });
        return res.status(ResponseStatus.NOT_FOUND).json({ message: "Knowledge item not found." });
    }
    item.title = title ?? item.title;
    item.description = description ?? item.description;
    item.specialization = specialization ?? item.specialization;
    item.content = content ?? item.content;
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
    logger.info("[server][knowledgebase][controller] updateKnowledgeItem request processed", { itemId: id });
    return res.status(ResponseStatus.SUCCESS).json(result);
}
export const deleteKnowledgeBaseItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const item = await repo.findOne({ where: { id } });
    if (!item) {
        logger.info("[server][knowledgebase][controller] deleteKnowledgeItem item not found", { itemId: id });
        return res.status(ResponseStatus.NOT_FOUND).json({ message: "Knowledge item not found." });
    }
    await repo.softRemove(item);
    logger.info("[server][knowledgebase][controller] deleteKnowledgeItem request processed", { itemId: id });
    return res.status(ResponseStatus.SUCCESS).send({success: true, message: "Knowledge item deleted successfully." });
}