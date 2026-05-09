import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { ILike, IsNull } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { User } from "../entities/User.js";
import {
  cacheTokens,
  generateAuthTokens,
  generateCsrfToken,
  setStatusActive,
} from "./auth.service.js";
import { AppError } from "../utils/AppError.js";
import { isEmailAllowedByDomainSettings } from "./site-settings.service.js";

const userRepo = PostgresDataSource.getRepository(User);

const getMicrosoftClient = () =>
  jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
  });

const getSigningKey = (header: any, callback: any) => {
  getMicrosoftClient().getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
};

const verifyMicrosoftIdToken = async (idToken: string) =>
  new Promise<any>((resolve, reject) => {
    jwt.verify(
      idToken,
      getSigningKey,
      {
        audience: process.env.AZURE_CLIENT_ID,
        issuer: [
          `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
          `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`,
        ],
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      },
    );
  });

export const loginWithMicrosoftSso = async (idToken: string, t: any) => {
  if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID) {
    throw new AppError(t("sso_not_configured"), 500);
  }

  const claims = await verifyMicrosoftIdToken(idToken);
  const email = (claims.email || claims.preferred_username || "").toLowerCase();

  if (!email) {
    throw new AppError(t("sso_email_missing"), 400);
  }

  if (!(await isEmailAllowedByDomainSettings(email))) {
    throw new AppError(t("email_domain_not_allowed"), 400);
  }

  const user = await userRepo.findOne({
    where: { email: ILike(email), deletedAt: IsNull() } as any,
    relations: ["usersPermissions", "userDepartments"],
  });

  if (!user) {
    throw new AppError(t("sso_user_not_found"), 403);
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.user_type,
    permission_profile: user.usersPermissions,
    name: {
      first: user.firstName,
      mid: user.midName,
      last: user.lastName,
    },
  };

  const { accessToken, refreshToken } = generateAuthTokens(payload);
  await Promise.all([
    cacheTokens(user.id, refreshToken, generateCsrfToken()),
    setStatusActive(user.id),
  ]);

  return {
    accessToken,
    refreshToken,
    permissions: user.userDepartments || [],
  };
};
