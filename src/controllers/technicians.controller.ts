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

export const createTechnician = async (
  req: RequestWithFileAndBody,
  res: Response,
) => {
  const technicianDto = mapCreateTechnician(req);

  const result = await createTechnicianService(technicianDto, req.file);
  if (!result.is_added) {
    result.message = t("user_not_created");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.CREATED).json({
    result,
  });
};

export const getTechniciansPaged = async (req, res) => {
  const query = parseGetUsersQuery(req.query);
  const lang = req.language;

  const result = await getAllTechnicianService(query, lang);
  return res
    .status(ResponseStatus.SUCCESS)
    .json({ users: result.users, meta_data: result.meta_ });
};

export const getTechnicianById = async (req, res) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";
  const isValid = uuidValidationSchema.safeParse(id);
  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found"), errors: [] });
  }
  const technician = await getTechnicianByIdService(id, lang);

  if (!technician) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(technician);
};

export const EditTechnician = async (req, res: Response) => {
  const TechnicianDto = mapCreateTechnician(req);
  const id = req.params.id;
  if (!id) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("user_not_found"), errors: [] });
  }

  const result = await editTechnicianService(id, TechnicianDto, req.file);
  if (!result.is_edited) {
    result.message = t("user_not_edited");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.SUCCESS).json({
    is_edited: result.is_edited,
    message: t("user_edited"),
  });
};

export const deleteTechnician = async (req, res: Response) => {
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_Technician_id") });
  }

  const result = await deleteTechnicianService(id);
  if (!result.is_deleted) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: result.is_deleted, message: result.message });
  }

  return res.status(ResponseStatus.SUCCESS).json({
    is_deleted: result.is_deleted,
    message: t("user_deleted"),
  });
};
