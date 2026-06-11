import { t } from "i18next";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { parseGroupsForUserQuery } from "../interfaces/users/IGroupsForUser.interface.js";
import { parseSpecializationsForUserQuery } from "../interfaces/users/ISpecializationsForUser.interface.js";
import logger from "../utils/logger.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";
import {
  updateRoleProfileEditAccessService,
  updateUserProfileEditAccessService,
} from "../services/users/profile/profileCommandService.js";
export const getGroupsForUserPagedController = async (req, res) => {
  const query = parseGroupsForUserQuery(req.params, req.query);
  const lang = req.language;

  // Validate user ID
  const idValidation = uuidValidationSchema.safeParse(query.userId);
  if (!query.userId || !idValidation.success) {
    logger.info(
      "[server][users][getGroupsForUserPagedController] Validation failed: invalid user id",
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json({ query, lang });
};

export const getSpecializationsForUserPagedController = async (req, res) => {
  const query = parseSpecializationsForUserQuery(req.params, req.query);
  const lang = req.language;

  // Validate user ID
  const idValidation = uuidValidationSchema.safeParse(query.userId);
  if (!query.userId || !idValidation.success) {
    logger.info(
      "[server][users][getSpecializationsForUserPagedController] Validation failed: invalid user id",
    );
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ message: t("user_not_found") });
  }

  return res.status(ResponseStatus.SUCCESS).json({ query, lang });
};

const parseAllowProfileEdit = (value: unknown) => {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return null;
};

export const toggleUserProfileEditAccessController = async (req, res) => {
  const { id } = req.params;
  const allowProfileEdit = parseAllowProfileEdit(req.body?.allow_profile_edit);
  const isValid = uuidValidationSchema.safeParse(id);

  if (!id || !isValid.success) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_updated: false, message: t("invalid_uuid") });
  }

  if (allowProfileEdit === null) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_updated: false, message: t("invalid_input") });
  }

  const result = await updateUserProfileEditAccessService(id, allowProfileEdit);

  return res.status(result.statusCode).json(result);
};

export const toggleRoleProfileEditAccessController = async (req, res) => {
  const allowProfileEdit = parseAllowProfileEdit(req.body?.allow_profile_edit);

  if (allowProfileEdit === null) {
    return res
      .status(ResponseStatus.BAD_REQUEST)
      .json({ is_updated: false, message: t("invalid_input") });
  }

  const result = await updateRoleProfileEditAccessService(
    req.params.role,
    allowProfileEdit,
  );

  return res.status(result.statusCode).json(result);
};
