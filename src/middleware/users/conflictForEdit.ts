import { Request, Response, NextFunction } from "express";
import {
  validateEmailAndSsnForAdd,
  validateEmailAndSsnForEdit,
} from "../../helpers/UserConflictHelper.js";
import { t } from "i18next";
import { IEditResponse } from "../../interfaces/response/IEditResponse.js";
import { uuidValidationSchema } from "../../validation/shared/uuidSchema.js";

export const validateEmailEditSsnMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, ssn } = req.body;
    const id = req.params.id;
    const errors: { key: string; message: string }[] = [];
    const isValid = uuidValidationSchema.safeParse(id);
    if (!isValid.success) {
      const response: IEditResponse = {
        is_edited: false,
        message: t("user_not_edited"),
        errors,
      };

      return res.status(400).json(response);
    }

    // Skip validation if both email and ssn are not provided
    if (!email || !ssn) {
      return next();
    }

    const conflictMessage = await validateEmailAndSsnForEdit(id, email, ssn);

    if (conflictMessage) {
      if (conflictMessage === "email_already_exists") {
        errors.push({ key: "email", message: t("email_already_exists") });
      }

      if (conflictMessage === "ssn_already_exists") {
        errors.push({ key: "ssn", message: t("ssn_already_exists") });
      }

      if (conflictMessage === "email_and_ssn_already_exist") {
        errors.push({ key: "email", message: t("email_already_exists") });
        errors.push({ key: "ssn", message: t("ssn_already_exists") });
      }

      const response: IEditResponse = {
        is_edited: false,
        message: t("user_not_edited"),
        errors,
      };

      return res.status(400).json(response);
    }

    next();
  } catch (error) {
    console.error("Error in validateEmailAndSsnMiddleware:", error);
    const response: IEditResponse = {
      is_edited: false,
      message: "Internal server error",
      errors: [{ key: "general", message: "An unexpected error occurred." }],
    };
    return res.status(500).json(response);
  }
};
