import { Request, Response } from "express";
import {
  bulkAssignUsersToGroup,
  createGroup,
  getAllGroups,
  getGroupById,
  getGroupUsersService,
  softDeleteGroup,
} from "../services/groups.service.js";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import {
  bulkAssignUsersSchema,
  createGroupSchema,
} from "../validation/group.schema.js";

export const addGroup = async (req: Request, res: Response) => {
  const t = req.t;

  logger.info("[server][groups][controller] Add group request received");

  const validated = createGroupSchema(t).safeParse(req.body);
  if (!validated.success) {
    logger.info(
      "[server][groups][controller] Validation failed: " +
        validated.error.issues.map((e) => e.message).join(", ")
    );
    throw new AppError(validated.error.issues[0].message, 400);
  }

  const result = await createGroup(validated.data, t);

  logger.info(
    `[server][groups][controller] Group created successfully id=${result.id}`
  );

  return res.status(200).json({
    is_added: true,
    message: t("group_added_successfully"),
    errors: [],
  });
};

export const bulkAssignUsersController = async (
  req: Request,
  res: Response
) => {
  const t = req.t;
  const groupId = req.params.id;

  logger.info("[server][groups][controller] bulkAssignUsers request received", {
    groupId,
  });

  // Validate body
  const result = bulkAssignUsersSchema(t).safeParse(req.body);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(", ");
    logger.info("[server][groups][controller] Validation failed: " + messages);
    throw new AppError(result.error.issues[0].message, 400);
  }

  await bulkAssignUsersToGroup(groupId, result.data.users, t);

  return res.status(200).json({
    is_updated: true,
    message: t("users_assigned_successfully"),
    errors: [],
  });
};

export const getGroupController = async (req: Request, res: Response) => {
  const t = req.t;
  const groupId = req.params.id;

  logger.info(
    "[server][groups][controller] getGroupController request received",
    { groupId }
  );

  if (!groupId) {
    logger.info("[server][groups][controller] Group ID missing");
    throw new AppError(t("group_id_required"), 400);
  }

  const group = await getGroupById(groupId, t);
  return res.status(200).json(group);
};

export const deleteGroupController = async (req: Request, res: Response) => {
  const t = req.t;
  const groupId = req.params.id;

  logger.info(
    "[server][groups][controller] deleteGroupController request received",
    { groupId }
  );

  if (!groupId) {
    logger.info("[server][groups][controller] Group ID missing");
    throw new AppError(t("group_id_required"), 400);
  }

  try {
    const result = await softDeleteGroup(groupId, t);
    return res.status(200).json(result);
  } catch (err: any) {
    logger.error("[server][groups][controller] Error deleting group", {
      error: err,
    });
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: t("internal_server_error") });
  }
};

export const getAllGroupsController = async (req: Request, res: Response) => {
  const t = req.t;

  logger.info(
    "[server][groups][controller] getAllGroupsController request received",
    { query: req.query }
  );

  const { name, page_index, page_size } = req.query;

  const pagination = {
    page: page_index ? parseInt(page_index as string) : undefined,
    limit: page_size ? parseInt(page_size as string) : undefined,
  };

  const filters = {
    name: name as string | undefined,
  };

  const result = await getAllGroups(pagination, filters, t);

  return res.status(200).json(result);
};

export const getGroupUsersController = async (req: Request, res: Response) => {
  const { id } = req.params;

  const data = await getGroupUsersService(id, req.query);

  return res.status(200).json({
    ...data,
  });
};
