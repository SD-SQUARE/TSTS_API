import { NextFunction, Request, Response } from "express";
import { ResponseStatus } from "../../enums/ResponseStatus.enum.js";
import {
  getAllowedEmailDomainNames,
  isEmailAllowedByDomainSettings,
} from "../../services/site-settings.service.js";
import { PostgresDataSource } from "../../database/postgres-data-source.js";
import { User } from "../../entities/User.js";

export const validateAllowedEmailDomainMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const email = typeof req.body?.email === "string" ? req.body.email : null;

  if (!email) {
    return next();
  }

  if (req.params?.id) {
    const existing = await PostgresDataSource.getRepository(User).findOne({
      where: { id: req.params.id },
      select: ["id", "email"],
    });

    if (existing?.email?.toLowerCase() === email.toLowerCase()) {
      return next();
    }
  }

  const isAllowed = await isEmailAllowedByDomainSettings(email);
  if (isAllowed) {
    return next();
  }

  const domains = await getAllowedEmailDomainNames();
  return res.status(ResponseStatus.BAD_REQUEST).json({
    message: req.t ? req.t("email_domain_not_allowed") : "Email domain is not allowed",
    errors: [
      {
        key: "email",
        message: req.t
          ? req.t("email_domain_not_allowed_with_list", {
              domains: domains.join(", "),
            })
          : `Email domain must be one of: ${domains.join(", ")}`,
      },
    ],
  });
};
