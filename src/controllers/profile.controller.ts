import { Response, Request } from "express";

import { t } from "i18next";

import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import {
  fetchUserGroupsByTypeService,
  fetchUserSpecializationsService,
  getMyProfile,
  getUserProfileByType,
} from "../services/users/profile/profileQueryService.js";
import { IPagination } from "../interfaces/shared/IPagination.js";
import { AppError } from "../utils/AppError.js";
import { resetProfilePassword } from "../services/auth.service.js";

export const getUserProfileById = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await getUserProfileByType(id, lang);

  if (!profile || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(profile);
};

export const resetUserPassword = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }
  
  try {
    const { password } = req.body;

    const result = await resetProfilePassword(password,id);

    return res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};



export const getMyProfileById = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await getMyProfile(id, lang);

  if (!profile || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json(profile);
};

export const getUserGroups = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const pagination: IPagination = req.query;

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await fetchUserGroupsByTypeService(id, pagination, lang);

  return res.status(ResponseStatus.SUCCESS).json(profile);
};

export const getUserSpecializations = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const pagination: IPagination = req.query;

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await fetchUserSpecializationsService(id, pagination, lang);

  return res.status(ResponseStatus.SUCCESS).json(profile);
};
