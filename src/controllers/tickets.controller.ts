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
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { deleteTicketService } from "../services/tickets/ticket.command.service.js";
import { t } from "i18next";
import { editTicketForAdminAndTechniciansSchema } from "../validation/tickets/edit-for-admins-and-technicians.js";
import { editTicketForAdminAndTechniciansService } from "../services/tickets/command/edit-for-admins-and-technicians.service.js";
import { TokenHelper } from "../helpers/TokenHelper.js";
import { editTicketForRequesterService } from "../services/tickets/command/edit-for-requester.service.js";
import { editTicketForRequesterSchema } from "../validation/tickets/edit-for-requester.js";

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

export const editTicketForAdminsAndTechniciansController = async (
  req: any,
  res: Response
) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);

  const ticketId = req.params.id;
  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][controller] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("ticket.invalid_id") });
  }

  // Validate request body
  const schema = editTicketForAdminAndTechniciansSchema(req.t);

  const parsed = schema.safeParse(req.body);

  const result = await editTicketForAdminAndTechniciansService(
    ticketId,
    parsed.data,
    userData
  );

  if (!result.is_edited) {
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const editTicketForRequesterController = async (
  req: any,
  res: Response
) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);

  const ticketId = req.params.id;
  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][controller] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("ticket.invalid_id") });
  }

  // Validate request body
  const schema = editTicketForRequesterSchema(req.t);

  const parsed = schema.safeParse(req.body);

  const result = await editTicketForRequesterService(
    ticketId,
    parsed.data,
    userData
  );

  if (!result.is_edited) {
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const deleteTicketController = async (req: Request, res: Response) => {
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    logger.info(
      "[server][tickets][controller] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("ticket.invalid_id") });
  }

  const result = await deleteTicketService(id);
  if (!result.is_deleted) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  return res.status(ResponseStatus.SUCCESS).json(result);
};
