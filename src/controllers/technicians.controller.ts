import { Response } from "express";
import { t } from "i18next";

import { parseGetUsersQuery } from "../interfaces/users/IGetUsersQuery.js";

import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {
  mapCreateTechnician,
  RequestWithFileAndBody,
} from "../mappers/technician/technicianMapper.js";
import {
  createTechnicianService,
  deleteTechnicianService,
  editTechnicianService,
} from "../services/users/technician/technicianCommandService.js";
import {
  getAllTechnicianService,
  getTechnicianByIdService,
} from "../services/users/technician/technicianQueryService.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import { audit } from "../helpers/auditBuilder.js";

export const createTechnician = async (
  req: RequestWithFileAndBody,
  res: Response,
) => {
  const auditLog = audit(req as any)
    .summary("Create technician")
    .action("CREATE_TECHNICIAN");

  const technicianDto = mapCreateTechnician(req);

  const result = await createTechnicianService(
    technicianDto,
    req.file,
    req as any,
  );
  if (!result.is_added) {
    auditLog
      .metadata({ errors: result.errors })
      .step("Technician creation failed");

    result.message = t("user_not_created");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  auditLog.step("Technician created successfully");

  return res.status(ResponseStatus.CREATED).json({
    result,
  });
};

export const getTechniciansPaged = async (req, res) => {
  const query = parseGetUsersQuery(req.query);
  const lang = req.language;

  const auditLog = audit(req)
    .summary("Fetch technicians list")
    .action("GET_TECHNICIANS")
    .resource("User", "technicians")
    .metadata({ query });

  const result = await getAllTechnicianService(query, lang);

  auditLog
    .metadata({
      total: result.meta_.total,
      returned: result.users.length,
    })
    .step("Technicians fetched successfully");

  return res
    .status(ResponseStatus.SUCCESS)
    .json({ users: result.users, meta_data: result.meta_ });
};

export const getTechnicianById = async (req, res) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const auditLog = audit(req)
    .summary("Fetch technician by ID")
    .action("GET_TECHNICIAN")
    .resource("User", id);

  const isValid = uuidValidationSchema.safeParse(id);
  if (!id || !isValid.success) {
    auditLog.metadata({ reason: "invalid_uuid" }).step("Invalid technician ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found"), errors: [] });
  }
  const technician = await getTechnicianByIdService(id, lang);

  if (!technician) {
    auditLog.step("Technician not found");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  auditLog.step("Technician fetched successfully");

  return res.status(ResponseStatus.SUCCESS).json(technician);
};

export const EditTechnician = async (req, res: Response) => {
  const TechnicianDto = mapCreateTechnician(req);
  const id = req.params.id;

  const auditLog = audit(req)
    .summary("Edit technician")
    .action("EDIT_TECHNICIAN")
    .resource("User", id);

  if (!id) {
    auditLog.step("Invalid technician ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("user_not_found"), errors: [] });
  }

  const result = await editTechnicianService(id, TechnicianDto, req.file, req);
  if (!result.is_edited) {
    auditLog.metadata({ errors: result.errors }).step("Technician edit failed");

    result.message = t("user_not_edited");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  auditLog.step("Technician edited successfully");

  return res.status(ResponseStatus.SUCCESS).json({
    is_edited: result.is_edited,
    message: t("user_edited"),
  });
};

export const deleteTechnician = async (req, res: Response) => {
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  const auditLog = audit(req)
    .summary("Delete technician")
    .action("DELETE_TECHNICIAN")
    .resource("User", id);

  if (!id || !isValid.success) {
    auditLog.step("Invalid technician ID");

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_Technician_id") });
  }

  const result = await deleteTechnicianService(id, req);
  if (!result.is_deleted) {
    auditLog.step("Technician deletion failed").metadata({ reason: result.message });

    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  auditLog.step("Technician deleted successfully");

  return res.status(ResponseStatus.SUCCESS).json({
    is_deleted: result.is_deleted,
    message: t("user_deleted"),
  });
};
