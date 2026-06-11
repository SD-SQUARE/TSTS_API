import { Request, Response, NextFunction } from "express";
import { UserType } from "../enums/UserType.enum.js";
import { t } from "i18next";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permission_profile: object;
  };
}

export const typeBasedAuthMiddleware = (allowedTypes: UserType[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: t("auth.user_not_authenticated") });
    }

    if (
      req.user.role === UserType.SUPER_ADMIN ||
      allowedTypes.includes(req.user.role as UserType)
    ) {
      return next();
    } else {
      return res.status(403).json({ message: t("auth.permissions_error") });
    }
  };
};
