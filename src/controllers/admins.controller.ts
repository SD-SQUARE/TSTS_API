import { Response } from "express";
import { t } from "i18next";
import { parseGetUsersQuery } from "../interfaces/users/IGetUsersQuery.js";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import {
  mapCreateAdmin,
  RequestWithFileAndBody,
} from "../mappers/admin/adminMapper.js";
import {
  createAdminService,
  deleteAdminService,
  editAdminService,
} from "../services/users/admin/adminCommandService.js";
import {
  getAdminByIdService,
  getAllAdminsService,
} from "../services/users/admin/adminQueryService.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import { Lang } from "../types/lang.types.js";

export const createAdmin = async (
  req: RequestWithFileAndBody,
  res: Response,
) => {
  const adminDto = mapCreateAdmin(req);

  const result = await createAdminService(adminDto, req.file);
  if (!result.is_added) {
    result.message = t("user_not_created");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.CREATED).json({
    result,
  });
};

export const getAdminsPaged = async (req, res) => {
  const query = parseGetUsersQuery(req.query);
  const lang = req.language;

  const result = await getAllAdminsService(query, lang);
  return res
    .status(ResponseStatus.SUCCESS)
    .json({ users: result.users, meta_data: result.meta_ });
};

export const getAdminById = async (req, res) => {
  const id = req.params.id;
  const lang = req.language as Lang;

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_admin_id") });
  }

  const admin = await getAdminByIdService(id, lang);

  if (!admin || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(admin);
};

export const EditAdmin = async (req, res: Response) => {
  const adminDto = mapCreateAdmin(req);
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);
  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_edited: false, message: t("user_not_found"), errors: [] });
  }

  const result = await editAdminService(id, adminDto, req.file);
  if (!result.is_edited) {
    result.message = t("user_not_edited");
    return res.status(ResponseStatus.BAD_REQUEST).json(result);
  }
  return res.status(ResponseStatus.SUCCESS).json({
    is_edited: result.is_edited,
    message: t("user_edited"),
  });
};

export const deleteAdmin = async (req, res: Response) => {
  const id = req.params.id;
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_Admin_id") });
  }

  const result = await deleteAdminService(id);
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
