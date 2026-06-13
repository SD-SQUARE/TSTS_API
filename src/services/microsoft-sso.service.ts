import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { ILike, IsNull } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { User } from "../entities/User.js";
import {
  cacheTokens,
  generateAuthTokens,
  generateCsrfToken,
  getEffectivePermissionKeysForUser,
  setStatusActive,
} from "./auth.service.js";
import { AppError } from "../utils/AppError.js";
import { isEmailAllowedByDomainSettings } from "./site-settings.service.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";

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

export const loginWithMicrosoftSso = async (idToken: string, req: any) => {
  const t = req.t;
  if (!process.env.AZURE_TENANT_ID || !process.env.AZURE_CLIENT_ID) {
    audit(req)?.step('SSO not configured');
    throw new AppError(t("sso_not_configured"), 500);
  }

  let claims;
  try {
    claims = await verifyMicrosoftIdToken(idToken);
  } catch (error: any) {
    console.error("[SSO] Token verification failed:", error);
    audit(req)?.step('SSO token verification failed').metadata({ error: error.message });
    throw new AppError(t("sso_token_invalid"), 401);
  }

  const email = (claims.email || claims.preferred_username || "").toLowerCase();

  if (!email) {
    audit(req)?.step('SSO email missing from claims');
    throw new AppError(t("sso_email_missing"), 400);
  }

  audit(req)?.step('SSO login attempt').metadata({ email });
  console.log(`[SSO] Attempting login for email: ${email}`);

  // Check if email domain is allowed
  const domainAllowed = await isEmailAllowedByDomainSettings(email);
  if (!domainAllowed) {
    console.warn(`[SSO] Email domain not allowed: ${email}`);
    audit(req)?.step('SSO email domain not allowed').metadata({ email });
    throw new AppError(t("email_domain_not_allowed"), 403);
  }

  // Find user in database
  const user = await userRepo.findOne({
    where: { email: ILike(email), deletedAt: IsNull() } as any,
    relations: ["usersPermissions", "userDepartments"],
  });

  if (!user) {
    console.warn(`[SSO] User not found in database: ${email}`);
    audit(req)?.step('SSO user not found').metadata({ email });
    throw new AppError(t("sso_user_not_found"), 403);
  }

  audit(req)?.resource('USER', user.id).step('SSO user found, generating tokens');
  console.log(`[SSO] User found: ${user.id}, generating tokens...`);

  const permissions = await getEffectivePermissionKeysForUser(user.id);
  const payload = {
    id: user.id,
    email: user.email,
    role: user.user_type,
    permission_profile: user.usersPermissions,
    permissions,
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

  audit(req)?.step('SSO login successful').summary('User logged in via SSO').metadata({ loginMethod: 'microsoft_sso' });
  console.log(`[SSO] Login successful for user: ${user.id}`);

  return {
    accessToken,
    refreshToken,
    permissions,
  };
};
