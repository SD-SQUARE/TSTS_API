import { Request, Response, NextFunction } from "express";
import { validateEmailAndSsnForAdd } from "../../helpers/UserConflictHelper.js";
import { t } from "i18next";
import { ICreateResponse } from "../../interfaces/response/ICreateResponse.js";

export const validateEmailAndSsnMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, ssn } = req.body;

    const errors: { key: string; message: string }[] = [];

    const conflictMessage = await validateEmailAndSsnForAdd(email, ssn);

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

      const response: ICreateResponse = {
        is_added: false,
        message: t("user_not_created"),
        errors,
      };

      return res.status(400).json(response);
    }

    next();
  } catch (error) {
    console.error("Error in validateEmailAndSsnMiddleware:", error);
    const response: ICreateResponse = {
      is_added: false,
      message: "Internal server error",
      errors: [{ key: "general", message: "An unexpected error occurred." }],
    };
    return res.status(500).json(response);
  }
};
