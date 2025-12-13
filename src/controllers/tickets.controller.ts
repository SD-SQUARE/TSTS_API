// src/controllers/tickets.controller.ts
import { Request, Response } from "express";
import { createTicketSchema } from "../validation/ticket.schema.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import {
  createTicket,
  getAllTicketsService,
  getSingleTicketService,
  getTicketActivitiesService,
} from "../services/tickets.service.js";

export const createTicketController = async (req: Request, res: Response) => {
  const schema = createTicketSchema(req.t);
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    logger.info(
      "[server][tickets][controller] Validation failed: " +
        parsed.error.issues.map((e) => e.message).join(", ")
    );
    throw new AppError(parsed.error.issues[0].message, 400);
  }

  const result = await createTicket(parsed.data, req.files);

  return res.status(200).json(result);
};

export const getAllTicketsController = async (req: Request, res: Response) => {
  const lang = (req.language || "en") as "ar" | "en";

  const result = await getAllTicketsService(req.query, lang);

  return res.status(200).json(result);
};

export const getSingleTicketController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const lang = (req.language || "en") as "ar" | "en";

  const ticket = await getSingleTicketService(id, lang);

  if (!ticket) {
    logger.info(`[server][tickets] Ticket not found: ${id}`);
    throw new AppError("Ticket not found", 404);
  }

  return res.status(200).json(ticket);
};

export const getTicketActivitiesController = async (
  req: Request,
  res: Response
) => {
  const ticketId = req.params.id;

  const activities = await getTicketActivitiesService(ticketId);
  return res.status(200).json(activities);
};
