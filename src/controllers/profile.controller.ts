import { Response, Request } from "express";

import { t } from "i18next";

import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import {
  fetchUserGroupsService,
  fetchUserSpecializationsService,
  getMyProfile,
  getUserProfileByType,
} from "../services/users/profile/profileQueryService.js";
import { IPagination } from "../interfaces/shared/IPagination.js";

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

  const profile = await fetchUserGroupsService(id, pagination, lang);

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
