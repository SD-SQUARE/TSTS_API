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
import { uploadTicketMediaSchema } from "../validation/tickets/media/upload-ticket-media-schema.js";
import { uploadTicketAssetsService } from "../services/tickets/tickets-media/command/upload-tickets-assets.service.js";
import { file } from "zod";
import {
  getSingleTicketAssetService,
  getTicketAssetsService,
} from "../services/tickets/tickets-media/query/get-ticket-assets.service.js";
import { deleteSingleTicketAssetService } from "../services/tickets/tickets-media/command/delete-asset-ticket.service.js";

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
      "[server][tickets][editTicketForAdminsAndTechniciansController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("ticket.invalid_id") });
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
      "[server][tickets][editTicketForRequesterController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("ticket.invalid_id") });
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
      "[server][tickets][deleteTicketController] Validation failed: invalid ticket id"
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

export const uploadTicketAssetController = async (req: any, res: Response) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);
  const ticketId = req.params.id;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][uploadTicketAssetController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_added: false, message: t("ticket.invalid_id") });
  }

  const validation = uploadTicketMediaSchema.safeParse({
    files: req.files,
  });

  if (!validation.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("ticket.at_least_one_file_required") });
  }

  const files = req.files;

  const result = await uploadTicketAssetsService(ticketId, files, userData);

  logger.info(
    `[server][tickets][uploadTicketAssetController] User ${
      userData.id
    } uploaded files to ticket ${ticketId}: ${files
      .map((file: any) => file.originalname)
      .join(", ")}`
  );

  if (!result.is_added) return res.status(ResponseStatus.BAD_REQUEST).json(res);

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const getAllTicketAssetsController = async (req: any, res: Response) => {
  const ticketId = req.params.id;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][getAllTicketAssetsController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("ticket.invalid_id") });
  }

  const result = await getTicketAssetsService(ticketId);

  if (!result.ok)
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: result.message, errors: result.errors });
  return res.status(ResponseStatus.SUCCESS).json(result.data);
};

export const getSingleTicketAssetController = async (
  req: any,
  res: Response
) => {
  const ticketId = req.params.id;
  const aid = req.params.aid; // asset ID

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][getSingleTicketAssetController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.invalid_id") });
  }

  // Validate asset ID (aid)
  const assetIdValidation = uuidValidationSchema.safeParse(aid);
  if (!aid || !assetIdValidation.success) {
    logger.info(
      "[server][tickets][getSingleTicketAssetController] Validation failed: invalid asset id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("asset.invalid_id") });
  }

  const result = await getSingleTicketAssetService(ticketId, aid);

  if (!result.ok)
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: result.message, errors: result.errors });
  return res.status(ResponseStatus.SUCCESS).json(result.data);
};

export const deleteTicketAssetController = async (req: any, res: Response) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);

  const ticketId = req.params.id;
  const aid = req.params.aid; // asset ID

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][deleteTicketAssetController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.invalid_id") });
  }

  // Validate asset ID (aid)
  const assetIdValidation = uuidValidationSchema.safeParse(aid);
  if (!aid || !assetIdValidation.success) {
    logger.info(
      "[server][tickets][deleteTicketAssetController] Validation failed: invalid asset id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("asset.invalid_id") });
  }

  const result = await deleteSingleTicketAssetService(ticketId, aid, userData);
  if (!result.is_deleted) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const uploadTicketChatMediaController = async (
  req: any,
  res: Response
) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);
  const ticketId = req.params.id;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][uploadTicketChatMediaController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_added: false, message: t("ticket.invalid_id") });
  }

  const validation = uploadTicketMediaSchema.safeParse({
    files: req.files,
  });

  if (!validation.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("ticket.at_least_one_file_required") });
  }

  const files = req.files;

  return res.status(ResponseStatus.SUCCESS).json({ files, ticketId });
};

export const sendChatMessageController = async (req: any, res: Response) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);
  const ticketId = req.params.id;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][sendChatMessageController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_added: false, message: t("ticket.invalid_id") });
  }

  const { senderId, message, mediaIds } = req.body;

  return res
    .status(ResponseStatus.SUCCESS)
    .json({ ticketId, senderId, message, mediaIds });
};

export const getChatMessagesForTicketController = async (
  req: any,
  res: Response
) => {
  const ticketId = req.params.id;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][getChatMessagesForTicketController] Validation failed: invalid ticket id"
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_added: false, message: t("ticket.invalid_id") });
  }

  return res.status(ResponseStatus.SUCCESS).json({ ticketId });
};
