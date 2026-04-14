import { Request, Response } from "express";
import { createTicketSchema } from "../validation/ticket.schema.js";
import logger from "../utils/logger.js";
import { AppError } from "../utils/AppError.js";
import {
  changeTicketStatusService,
  createTicket,
  createTicketReviewService,
  getAllTicketsService,
  getSingleTicketService,
  getTicketActivitiesService,
  getTicketReviewsService,
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
import { uploadTicketChatMediaService } from "../services/tickets/tickets-chat/upload-chat-media.service.js";
import { createTicketChatMessageService } from "../services/tickets/tickets-chat/send-chat-message.service.js";
import { ICreateResponse } from "../interfaces/response/ICreateResponse.js";
import { getChatMessagesForTicketServices } from "../services/tickets/tickets-chat/get-chat-messages-for-ticket.service.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

export const createTicketController = async (req: Request, res: Response) => {
  const schema = createTicketSchema(req.t);
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    logger.info(
      "[server][tickets][controller] Validation with body: ",
      req.body,
    );
    logger.info(
      "[server][tickets][controller] Validation failed: " +
        parsed.error.issues.map((e) => e.message).join(", "),
    );
    throw new AppError(parsed.error.issues[0].message, 400);
  }

  const result = await createTicket(parsed.data, req.files, req);

  return res.status(200).json(result);
};

export const getAllTicketsController = async (req: Request, res: Response) => {
  const lang = (req.language || "en") as "ar" | "en";
  const user = (req as any).user;

  const result = await getAllTicketsService(req.query, lang, user, req);

  return res.status(200).json(result);
};

export const getSingleTicketController = async (
  req: Request,
  res: Response,
) => {
  const { id } = req.params;
  const lang = (req.language || "en") as "ar" | "en";
  const userId = (req as any).user.id;
  const userFullName = (req as any).user.name;
  logger.info(`[server][tickets] getSingleTicket | user: ${userFullName}`, {
    userFullName,
  });
  const userName =
    userFullName.first["en"] +
    " " +
    userFullName.mid["en"] +
    " " +
    userFullName.last["en"] +
    " / " +
    userFullName.first["ar"] +
    " " +
    userFullName.mid["ar"] +
    " " +
    userFullName.last["ar"] +
    " / role:  " +
    (req as any).user.role;

  const auditLog = audit()
    .summary("Get Single Ticket")
    .action(AuditAction.GET_TICKET)
    .metadata({ userId, userName, ticketId: id })
    .step("Start fetching ticket");

  const ticket = await getSingleTicketService(id, lang, userId, userName, req);

  if (!ticket) {
    auditLog.step("Ticket not found").metadata({ ticketId: id });

    logger.info(`[server][tickets] Ticket not found: ${id}`);
    throw new AppError("Ticket not found", 404);
  }

  auditLog
    .step("Ticket fetched successfully")
    .metadata({ ticketId: ticket.id });

  return res.status(200).json(ticket);
};

export const getTicketActivitiesController = async (
  req: Request,
  res: Response,
) => {
  const ticketId = req.params.id;

  const auditLog = audit(req)
    .summary("Get Ticket Activities")
    .action(AuditAction.GET_TICKET_ACTIVITIES)
    .resource("Ticket", ticketId);

  auditLog.step("Start fetching ticket activities");

  const activities = await getTicketActivitiesService(ticketId, req.query, req);

  auditLog
    .metadata({ activitiesCount: activities.length })
    .step("Ticket activities fetched successfully");

  return res.status(200).json(activities);
};

export const editTicketForAdminsAndTechniciansController = async (
  req: any,
  res: Response,
) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);

  const ticketId = req.params.id;

  const auditLog = audit(req)
    .summary("Edit Ticket (Admin/Technician)")
    .action(AuditAction.EDIT_TICKET)
    .resource("Ticket", ticketId)
    .metadata({ userId: userData.id })
    .step("Start ticket edit request");

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    auditLog.metadata({ reason: "invalid_uuid" }).step("Invalid ticket ID");

    logger.info(
      "[server][tickets][editTicketForAdminsAndTechniciansController] Validation failed: invalid ticket id",
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
    userData,
    req,
  );

  if (!result.is_edited) {
    auditLog
      .metadata({ errors: parsed.error.issues })
      .step("Validation failed for request body");

    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }

  auditLog.step("Ticket edited successfully");

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const editTicketForRequesterController = async (
  req: any,
  res: Response,
) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);

  const ticketId = req.params.id;
  const auditLog = audit(req)
    .summary("Edit Ticket (Requester)")
    .action(AuditAction.EDIT_TICKET_REQUESTER)
    .resource("Ticket", ticketId)
    .metadata({ userId: userData.id })
    .step("Start requester ticket edit");

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    auditLog.metadata({ reason: "invalid_uuid" }).step("Invalid ticket ID");

    logger.info(
      "[server][tickets][editTicketForRequesterController] Validation failed: invalid ticket id",
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
    userData,
    req,
  );

  if (!result.is_edited) {
    auditLog
      .metadata({ reason: result.message, errors: result.errors })
      .step("Requester ticket edit failed");

    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const deleteTicketController = async (req: Request, res: Response) => {
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);
  const userId = (req as any).user.id;

  const auditLog = audit(req)
    .summary("Delete Ticket")
    .action(AuditAction.DELETE_TICKET)
    .resource("Ticket", id)
    .metadata({ userId })
    .step("Start ticket deletion");

  if (!id || !isValid.success) {
    auditLog.metadata({ reason: "invalid_uuid" }).step("Invalid ticket ID");

    logger.info(
      "[server][tickets][deleteTicketController] Validation failed: invalid ticket id",
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("ticket.invalid_id") });
  }

  const result = await deleteTicketService(id, userId, req);
  if (!result.is_deleted) {
    auditLog
      .metadata({ reason: result.message })
      .step("Ticket deletion failed");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  auditLog.step("Ticket deleted successfully");

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const uploadTicketAssetController = async (req: any, res: Response) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);
  const ticketId = req.params.id;

  const auditLog = audit(req)
    .summary("Upload ticket assets")
    .action(AuditAction.UPLOAD_TICKET_ASSETS)
    .resource("Ticket", ticketId);

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    auditLog
      .metadata({ reason: "invalid_ticket_id" })
      .step("Invalid ticket ID");

    logger.info(
      "[server][tickets][uploadTicketAssetController] Validation failed: invalid ticket id",
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_added: false, message: t("ticket.invalid_id") });
  }

  const validation = uploadTicketMediaSchema.safeParse({
    files: req.files,
  });

  if (!validation.success) {
    auditLog.step("Validation failed: no files provided");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("ticket.at_least_one_file_required") });
  }

  const files = req.files;

  const result = await uploadTicketAssetsService(
    ticketId,
    files,
    userData,
    req,
  );

  logger.info(
    `[server][tickets][uploadTicketAssetController] User ${
      userData.id
    } uploaded files to ticket ${ticketId}: ${files
      .map((file: any) => file.originalname)
      .join(", ")}`,
  );

  if (!result.is_added) {
    auditLog
      .metadata({ errors: result.errors })
      .step("Ticket asset upload failed");

    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }

  auditLog
    .metadata({
      filesCount: files.length,
    })
    .step("Ticket assets uploaded successfully");

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const getAllTicketAssetsController = async (req: any, res: Response) => {
  const ticketId = req.params.id;

  const auditLog = audit(req)
    .summary("Fetch ticket assets")
    .action(AuditAction.GET_TICKET_ASSETS)
    .resource("Ticket", ticketId);

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][getAllTicketAssetsController] Validation failed: invalid ticket id",
    );

    auditLog
      .metadata({ reason: "invalid_ticket_id" })
      .step("Invalid ticket ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("ticket.invalid_id") });
  }

  const result = await getTicketAssetsService(ticketId, req);

  if (!result.ok) {
    auditLog
      .metadata({ errors: result.errors })
      .step("Failed to fetch ticket assets");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: result.message, errors: result.errors });
  }

  auditLog
    .metadata({ assetsCount: result.data.length })
    .step("Ticket assets fetched successfully");

  return res.status(ResponseStatus.SUCCESS).json(result.data);
};

export const getSingleTicketAssetController = async (
  req: any,
  res: Response,
) => {
  const ticketId = req.params.id;
  const aid = req.params.aid; // asset ID

  const auditLog = audit(req)
    .summary("Fetch single ticket asset")
    .action(AuditAction.GET_SINGLE_TICKET_ASSET)
    .resource("Ticket", ticketId)
    .metadata({ assetId: aid });

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][getSingleTicketAssetController] Validation failed: invalid ticket id",
    );

    auditLog
      .metadata({ reason: "invalid_ticket_id" })
      .step("Invalid ticket ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.invalid_id") });
  }

  // Validate asset ID (aid)
  const assetIdValidation = uuidValidationSchema.safeParse(aid);
  if (!aid || !assetIdValidation.success) {
    logger.info(
      "[server][tickets][getSingleTicketAssetController] Validation failed: invalid asset id",
    );

    auditLog.metadata({ reason: "invalid_asset_id" }).step("Invalid asset ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("asset.invalid_id") });
  }

  const result = await getSingleTicketAssetService(ticketId, aid, req);

  if (!result.ok) {
    auditLog
      .metadata({ errors: result.errors })
      .step("Failed to fetch ticket asset");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: result.message, errors: result.errors });
  }

  auditLog.metadata({ assetId: aid }).step("Ticket asset fetched successfully");

  return res.status(ResponseStatus.SUCCESS).json(result.data);
};

export const deleteTicketAssetController = async (req: any, res: Response) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);

  const ticketId = req.params.id;
  const aid = req.params.aid; // asset ID

  const auditLog = audit(req)
    .summary("Delete ticket asset")
    .action(AuditAction.DELETE_TICKET_ASSET)
    .resource("Ticket", ticketId)
    .metadata({ assetId: aid });

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][deleteTicketAssetController] Validation failed: invalid ticket id",
    );
    auditLog
      .metadata({ reason: "invalid_ticket_id" })
      .step("Invalid ticket ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("ticket.invalid_id") });
  }

  // Validate asset ID (aid)
  const assetIdValidation = uuidValidationSchema.safeParse(aid);
  if (!aid || !assetIdValidation.success) {
    logger.info(
      "[server][tickets][deleteTicketAssetController] Validation failed: invalid asset id",
    );

    auditLog.metadata({ reason: "invalid_asset_id" }).step("Invalid asset ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: req.t("asset.invalid_id") });
  }

  const result = await deleteSingleTicketAssetService(
    ticketId,
    aid,
    userData,
    req,
  );

  if (!result.is_deleted) {
    auditLog
      .metadata({ reason: result.message })
      .step("Ticket asset deletion failed");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  auditLog.metadata({ assetId: aid }).step("Ticket asset deleted successfully");

  return res.status(ResponseStatus.SUCCESS).json(result);
};

export const uploadTicketChatMediaController = async (
  req: any,
  res: Response,
) => {
  const userData = TokenHelper.getUserFromReqUser(req.user);
  const ticketId = req.params.id;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][uploadTicketChatMediaController] Validation failed: invalid ticket id",
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

  const result = await uploadTicketChatMediaService(ticketId, files, userData);

  logger.info(
    `[server][tickets][uploadTicketAssetController] User ${
      userData.id
    } uploaded files to ticket ${ticketId}: ${files
      .map((file: any) => file.originalname)
      .join(", ")}`,
  );

  if (!result.ok)
    return res.status(ResponseStatus.BAD_REQUEST).json(result.data);

  return res.status(ResponseStatus.SUCCESS).json(result.data);
};

export const sendChatMessageController = async (req: any, res: Response) => {
  const ticketId = req.params.id;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][sendChatMessageController] Validation failed: invalid ticket id",
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_added: false, message: t("ticket.invalid_id") });
  }

  const { senderId, message, mediaIds } = req.body;
  const lang = req.language;

  var result = await createTicketChatMessageService(
    ticketId,
    senderId,
    mediaIds,
    message,
    lang,
  );

  if (!result.ok) {
    const payload: ICreateResponse = {
      is_added: false,
      message: result.message,
      errors: result.errors?.map((e) => ({
        key: e.key,
        message: e.message,
      })),
    };

    return res.status(ResponseStatus.BAD_REQUEST).json(payload);
  }

  return res.status(ResponseStatus.CREATED).json(result.data);
};

export const getChatMessagesForTicketController = async (
  req: any,
  res: Response,
) => {
  const ticketId = req.params.id;
  const lang = req.language;

  // Validate ticket ID
  const idValidation = uuidValidationSchema.safeParse(ticketId);
  if (!ticketId || !idValidation.success) {
    logger.info(
      "[server][tickets][getChatMessagesForTicketController] Validation failed: invalid ticket id",
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_added: false, message: t("ticket.invalid_id") });
  }

  const result = await getChatMessagesForTicketServices(ticketId, lang);
  return res.status(ResponseStatus.SUCCESS).json(result.data);
};

export const createTicketReviewController = async (req: any, res: Response) => {
  const ticketId = req.params.id;
  const user = req.user;

  const { rating, note } = req.body;

  const auditLog = audit(req)
    .summary("Create ticket review")
    .action(AuditAction.CREATE_TICKET_REVIEW)
    .resource("Ticket", ticketId)
    .metadata({ reviewerId: user.id, rating });

  const result = await createTicketReviewService(
    ticketId,
    { rating, note },
    user,
    auditLog,
  );

  return res.status(result.status).json(result.payload);
};

export const getTicketReviewsController = async (req: any, res: any) => {
  const ticketId = req.params.id;
  const user = req.user;

  const auditLog = audit(req)
    .summary("Fetch ticket reviews")
    .action(AuditAction.GET_TICKET_REVIEWS)
    .resource("Ticket", ticketId)
    .metadata({ userId: user.id });

  const result = await getTicketReviewsService(ticketId, user, req.t, auditLog);

  return res.status(result.status).json(result.payload);
};

export const changeTicketStatusController = async (req: any, res: Response) => {
  const ticketId = req.params.id;
  const user = req.user;

  const { status } = req.body;

  const auditLog = audit(req)
    .summary("Change ticket status")
    .action(AuditAction.CHANGE_TICKET_STATUS)
    .resource("Ticket", ticketId)
    .metadata({ userId: user.id, requestedStatus: status });

  const result = await changeTicketStatusService(
    ticketId,
    { status },
    user,
    req.t,
    auditLog,
    req,
  );
  
  return res.status(result.status).json(result.payload);
};
