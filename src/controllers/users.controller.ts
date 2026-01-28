import { t } from "i18next";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { parseGroupsForUserQuery } from "../interfaces/users/IGroupsForUser.interface.js";
import { parseSpecializationsForUserQuery } from "../interfaces/users/ISpecializationsForUser.interface.js";
import logger from "../utils/logger.js";
import { uuidValidationSchema } from "../validation/shared/uuidSchema.js";

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
