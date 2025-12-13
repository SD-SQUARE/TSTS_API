// src/controllers/tickets.controller.ts
import { Request, Response } from "express";
import { createTicketSchema } from "../validation/ticket.schema.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import { createTicket } from "../services/tickets.service.js";

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
