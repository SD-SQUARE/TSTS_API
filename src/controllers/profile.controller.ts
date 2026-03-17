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
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

export const getUserProfileById = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const isValid = uuidValidationSchema.safeParse(id);

  const auditLog = audit(req)
    .summary("Fetch user profile by ID")
    .ACTION(AuditAction.GET_USER_PROFILE)
    .resource("User", id);

  if (!id || !isValid.success) {
    auditLog
      .metadata({ status: "invalid_uuid" })
      .step("Validation failed: invalid UUID");
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await getUserProfileByType(id, lang);

  if (!profile || !isValid.success) {
    auditLog.metadata({ status: "not_found" }).step("User not found");
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  auditLog
    .metadata({ status: "success" })
    .step("User profile fetched successfully");
  return res.status(ResponseStatus.SUCCESS).json(profile);
};

export const resetUserPassword = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const auditLog = audit(req)
    .summary("Reset user password")
    .ACTION(AuditAction.RESET_USER_PASSWORD)
    .resource("User", id);

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    auditLog
      .metadata({ status: "invalid_uuid" })
      .step("Validation failed: invalid UUID");
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  try {
    const { password } = req.body;

    const result = await resetProfilePassword(password, id, auditLog);

    if (result.is_updated) {
      auditLog
        .metadata({ status: "success" })
        .step("Password reset successfully");
    } else {
      auditLog
        .metadata({ status: "failed", error: result.error })
        .step("Password reset failed");
    }

    return res.status(200).json(result);
  } catch (err: any) {
    auditLog
      .metadata({ status: "error", error: err.message })
      .step("Password reset threw exception");
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ message: err.message });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyProfileById = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const auditLog = audit(req)
    .summary("Get my profile by ID")
    .ACTION(AuditAction.GET_MY_PROFILE)
    .resource("User", id);

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    auditLog
      .metadata({ status: "invalid_uuid" })
      .step("Validation failed: invalid UUID");
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await getMyProfile(id, lang);

  if (!profile || !isValid.success) {
    auditLog.metadata({ status: "not_found" }).step("Profile not found");
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  auditLog
    .metadata({ status: "success" })
    .step("Profile retrieved successfully");
  return res.status(ResponseStatus.SUCCESS).json(profile);
};

export const getUserGroups = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const auditLog = audit(req)
    .summary("Fetch user groups by user ID")
    .ACTION(AuditAction.GET_USER_GROUPS)
    .resource("User", id);

  const pagination: IPagination = req.query;

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    auditLog
      .metadata({ status: "invalid_uuid" })
      .step("Validation failed: invalid UUID");
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await fetchUserGroupsByTypeService(id, pagination, lang);

  auditLog
    .metadata({ status: "success", groups_count: profile.groups.length })
    .step("User groups retrieved successfully");

  return res.status(ResponseStatus.SUCCESS).json(profile);
};

export const getUserSpecializations = async (req: Request, res: Response) => {
  const id = req.params.id;
  const lang = req.language as "en" | "ar";

  const auditLog = audit(req)
    .summary("Fetch user specializations by user ID")
    .ACTION(AuditAction.GET_USER_SPECIALIZATIONS)
    .resource("User", id);

  const pagination: IPagination = req.query;

  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    auditLog
      .metadata({ status: "invalid_uuid" })
      .step("Validation failed: invalid UUID");
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_deleted: false, message: t("invalid_uuid") });
  }

  const profile = await fetchUserSpecializationsService(id, pagination, lang);

  auditLog
    .metadata({
      status: "success",
      specializations_count: profile.specializations.length,
    })
    .step("User specializations retrieved successfully");

  return res.status(ResponseStatus.SUCCESS).json(profile);
};
