import { Request, Response } from "express";
import {
  createGroup,
  editGroup,
  getAllGroups,
  getGroupById,
  getGroupUsersService,
  softDeleteGroup,
  upsertGroupAssignments,
} from "../services/groups.service.js";
import { AppError } from "../utils/AppError.js";
import logger from "../utils/logger.js";
import {
  createGroupSchema,
  editGroupSchema,
  upsertGroupAssignmentsSchema,
} from "../validation/group.schema.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

export const addGroup = async (req: Request, res: Response) => {
  const t = req.t;

  logger.info("[server][groups][controller] Add group request received");

  const validated = createGroupSchema(t).safeParse(req.body);
  if (!validated.success) {
    logger.info(
      "[server][groups][controller] Validation failed: " +
        validated.error.issues.map((e) => e.message).join(", "),
    );
    throw new AppError(validated.error.issues[0].message, 400);
  }

  audit(req)
    .summary("Add group request received")
    .action(AuditAction.ADD_GROUP)
    .metadata({ requestBody: req.body })
    .step("Validated input");

  const result = await createGroup(validated.data, t, req);

  audit(req)
    .step("Group creation completed")
    .resource("group", result.id)
    .metadata({ groupName: result.name });

  logger.info(
    `[server][groups][controller] Group created successfully id=${result.id}`,
  );

  return res.status(200).json({
    is_added: true,
    message: t("group_added_successfully"),
    errors: [],
  });
};

export const upsertGroupAssignmentsController = async (
  req: Request,
  res: Response,
) => {
  const t = req.t;
  const groupId = req.params.id;

  const auditLog = audit(req)
    .summary("Bulk assign users to group")
    .action(AuditAction.BULK_ASSIGN_USERS)
    .metadata({ groupId, requestBody: req.body });

  logger.info("[server][groups][controller] bulkAssignUsers request received", {
    groupId,
  });

  // Validate body
  const result = upsertGroupAssignmentsSchema(t).safeParse(req.body);
  if (!result.success) {
    const messages = result.error.issues.map((i) => i.message).join(", ");
    auditLog.step(`Validation failed: ${messages}`);
    logger.info("[server][groups][controller] Validation failed: " + messages);
    throw new AppError(result.error.issues[0].message, 400);
  }

  const assignmentResult = await upsertGroupAssignments(
    groupId,
    result.data,
    t,
    req,
  );

  auditLog
    .step(`Group assignments updated`)
    .resource("group", groupId)
    .metadata({ users: result.data.users, teams: result.data.teams.length });

  return res.status(200).json({
    is_updated: assignmentResult.is_updated,
    message: assignmentResult.message,
    errors: [],
  });
};

export const getGroupController = async (req: Request, res: Response) => {
  const t = req.t;
  const lang = req.language;
  const groupId = req.params.id;

  const auditLog = audit(req)
    .summary("Get group details")
    .action(AuditAction.GET_GROUP)
    .metadata({ groupId });

  logger.info(
    "[server][groups][controller] getGroupController request received",
    { groupId },
  );

  if (!groupId) {
    auditLog.step("Group ID missing");
    logger.info("[server][groups][controller] Group ID missing");
    throw new AppError(t("group_id_required"), 400);
  }

  const group = await getGroupById(groupId, t, lang, req);

  auditLog
    .step("Group retrieved successfully")
    .resource("group", group.id)
    .metadata({ groupName: group.name_en });
  return res.status(200).json(group);
};

export const deleteGroupController = async (req: Request, res: Response) => {
  const t = req.t;
  const groupId = req.params.id;

  const auditLog = audit(req)
    .summary("Delete group request")
    .action(AuditAction.DELETE_GROUP)
    .metadata({ groupId });

  logger.info(
    "[server][groups][controller] deleteGroupController request received",
    { groupId },
  );

  if (!groupId) {
    auditLog.step("Group ID missing");
    logger.info("[server][groups][controller] Group ID missing");
    throw new AppError(t("group_id_required"), 400);
  }

  try {
    const result = await softDeleteGroup(groupId, t);
    auditLog
      .step(result.is_deleted ? "Group soft-deleted" : "Group already deleted")
      .resource("group", groupId);

    return res.status(200).json(result);
  } catch (err: any) {
    auditLog.step("Error deleting group");
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

  const auditLog = audit(req)
    .summary("Get all groups")
    .action(AuditAction.GET_ALL_GROUPS)
    .metadata({ query: req.query });

  logger.info(
    "[server][groups][controller] getAllGroupsController request received",
    { query: req.query },
  );

  const { name, page_index, page_size } = req.query;

  const pagination = {
    page: page_index ? parseInt(page_index as string) : undefined,
    page_size: page_size ? parseInt(page_size as string) : undefined,
  };

  const filters = {
    name: name as string | undefined,
  };

  const result = await getAllGroups(pagination, filters, t, req);

  auditLog.step(`Fetched ${result.groups.length} groups`).metadata({
    filters,
    pagination,
  });


  return res.status(200).json(result);
};

export const getGroupUsersController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page_index, page_size } = req.query;

  const auditLog = audit(req)
    .summary("Get users of a group")
    .action(AuditAction.GET_GROUP_USERS)
    .metadata({ id, query: req.query });

  const data = await getGroupUsersService(id, req.query, req);

  auditLog
    .step(`Users fetched: ${data.technicians.length} technicians, ${data.heads.length} heads, ${data.teams.length} teams`)
    .resource("group", id)
    .metadata({ page_index, page_size, total: data.meta_data.total });

  return res.status(200).json({
    ...data,
  });
};

export const editGroupController = async (req: any, res: any) => {
  const t = req.t;
  const groupId = req.params.id;

  const auditLog = audit(req)
    .summary("Edit group")
    .action(AuditAction.EDIT_GROUP)
    .metadata({ groupId });

  logger.info("[server][groups][controller] editGroup request received", {
    groupId,
    body: req.body,
  });

  if (!groupId) {
    auditLog.step("Group ID missing");
    throw new AppError(t("group_id_required"), 400);
  }

  try {
    const validated = editGroupSchema(t).safeParse(req.body);
    if (!validated.success) {
      throw new AppError(validated.error.issues[0].message, 400);
    }

    const result = await editGroup(groupId, validated.data, t, req);

    auditLog
      .step("Group edited successfully")
      .resource("group", groupId);

    return res.status(200).json(result);
  } catch (err: any) {
     auditLog.step("Error editing group");
    logger.error("[server][groups][controller] Error editing group", {
      error: err,
    });
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: t("internal_server_error") });
  }
};
