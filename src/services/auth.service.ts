import crypto from 'crypto';
import { PostgresDataSource } from '../database/postgres-data-source.js';
import { redisClient } from '../database/redis.js';
import { redisKeys } from '../utils/redisKeys.js';
import { User } from '../entities/User.js';
import { UserStatus } from '../enums/UserStatus.enum.js';
import { AppError } from '../utils/AppError.js';
import { generateToken, verifyToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/secrets.js';
import { StringValue } from 'ms';
import logger from '../utils/logger.js';
import { sendMail } from '../config/mailer.js';
import { t } from 'i18next';
import { PASSWORD_REGEX } from '../config/validations.js';
import { audit } from '../helpers/auditBuilder.js';
import { Request } from 'express';
import { AuditAction } from '../enums/AuditAction.enum.js';

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour
const LOCK_DURATION_SECONDS = 3600;
const REFRESH_TOKEN_DURATION_SECONDS = 604800; // 7 days
const CSRF_TOKEN_EXPIRES = 15 * 60; // 15 minutes in seconds
const FORGET_PASSWORD_EXPIRE = 3 * 60; // 3 minutes
const RESET_TOKEN_EXPIRE = 10 * 60;
const RESET_TOKEN_PREFIX = 'reset_token:';

const userRepo = PostgresDataSource.getRepository(User);

// Types
interface LoginResult {
  accessToken: string;
  refreshToken: string;
  email: string;
  permissions: any[];
}

interface UserPayload {
  name: {
    first: any;
    mid: any;
    last: any;
  };
  id: string;
  email: string;
  role: string;
  permission_profile: any;
}

export const loginUser = async (
  email: string,
  password: string,
  req?: Request,
): Promise<LoginResult> => {
  const t = req.t.bind(req);

  logger.info(`[server][auth] Login request received for email: ${email}`);
  audit(req)?.step('validating login input');

  if (!email || !password) {
    logger.info(`[server][auth] Missing email or password`);
    audit(req)?.step('missing email or password');
    throw new AppError(t('invalid_input'), 400);
  }

  audit(req)?.step('searching user by email');

  const user = await findByEmail(email);

  if (!user) {
    logger.info(`[server][auth] User not found for email: ${email}`);
    audit(req)?.step('user not found');
    throw new AppError(t('user_not_found'), 400);
  }

  logger.info(`[server][auth] User found: ${user.id}`);

  audit(req)?.step('user record found');

  // Check lock status
  audit(req)?.step('checking account lock status');
  if (await isLocked(email)) {
    logger.info(
      `[server][auth] Account locked due to too many attempts: ${email}`,
    );
    audit(req)?.step('account locked due to too many attempts');
    throw new AppError(t('account_locked'), 400);
  }

  // Validate password
  audit(req)?.step('validating password');
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    logger.info(`[server][auth] Invalid password attempt for ${email}`);
    audit(req)?.step('password validation failed');
    await handleFailedAttempt(email, t);
  }

  logger.info(`[server][auth] Password validated successfully for ${email}`);

  audit(req)?.step('password validated successfully');

  // Reset failed attempts
  audit(req)?.step('resetting login attempts');

  await resetAttempts(email);
  logger.info(`[server][auth] Reset failed attempts for ${email}`);

  // Token payload
  const userPayload: UserPayload = {
    name: {
      first: user.firstName,
      mid: user.midName,
      last: user.lastName,
    },
    id: user.id,
    email: user.email,
    role: user.user_type,
    permission_profile: user.usersPermissions,
  };

  logger.info(`[server][auth] Generating tokens for user ${user.id}`);

  audit(req)?.step('generating authentication tokens');

  const { accessToken, refreshToken } = generateAuthTokens(userPayload);
  const csrfToken = generateCsrfToken();

  // Cache tokens + update status
  audit(req)?.step('caching tokens and updating user status');
  await Promise.all([
    cacheTokens(user.id, refreshToken, csrfToken),
    setStatusActive(user.id),
  ]);

  logger.info(
    `[server][auth] Login successful: user=${user.id}, email=${email}`,
  );
  audit(req)?.step('login process completed');

  return {
    accessToken,
    refreshToken,
    email: user.email,
    permissions: user.userDepartments || [],
  };
};

export const findByEmail = async (email: string): Promise<User | null> => {
  logger.info(`[server][auth] Searching for user by email: ${email}`);

  const user = await userRepo.findOne({
    where: { email },
    relations: ["usersPermissions", "userDepartments"],
  });

  if (user) {
    logger.info(`[server][auth] Found user ${user.id} for email ${email}`);
  } else {
    logger.info(`[server][auth] No user found for email ${email}`);
  }

  return user;
};

export const handleFailedAttempt = async (email: string, t: (key: string) => string): Promise<void> => {
  logger.info(`[server][auth] Handling failed attempt for ${email}`);

  const attemptsKey = redisKeys.loginAttempts(email);
  const lockKey = redisKeys.lockUntil(email);

  const currentAttempts = Number(await redisClient.get(attemptsKey)) || 0;
  const newAttempts = currentAttempts + 1;

  logger.info(
    `[server][auth] Failed attempts for ${email}: ${currentAttempts} -> ${newAttempts}`,
  );

  await redisClient.set(attemptsKey, newAttempts.toString(), {
    EX: LOCK_DURATION_SECONDS,
  });

  if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockUntil = Date.now() + LOCK_DURATION_MS;
    await redisClient.set(lockKey, lockUntil.toString(), {
      EX: LOCK_DURATION_SECONDS,
    });

    logger.error(
      `[server][auth] User locked due to max attempts: ${email}, lockUntil=${lockUntil}`
    );

    throw new AppError(t("account_locked"), 400);
  }

  throw new AppError(t("invalid_input"), 400);
};

export const isLocked = async (email: string): Promise<boolean> => {
  const lockValue = await redisClient.get(redisKeys.lockUntil(email));

  if (!lockValue) return false;

  const locked = Date.now() < Number(lockValue);

  if (locked) {
    logger.info(`[server][auth] Account is locked for ${email}`);
  }

  return locked;
};

export const resetAttempts = async (email: string): Promise<void> => {
  logger.info(`[server][auth] Resetting login attempts for ${email}`);
  await Promise.all([
    redisClient.del(redisKeys.loginAttempts(email)),
    redisClient.del(redisKeys.lockUntil(email)),
  ]);
};

export const generateCsrfToken = (): string => {
  const token = crypto.randomBytes(32).toString("hex");
  logger.info(`[server][auth] CSRF token generated`);
  return token;
};

export const cacheTokens = async (
  userId: string,
  refreshToken: string,
  csrfToken: string
): Promise<void> => {
  logger.info(`[server][auth] Caching tokens for user=${userId}`);

  await Promise.all([
    redisClient.set(redisKeys.refreshToken(userId), refreshToken, {
      EX: REFRESH_TOKEN_DURATION_SECONDS,
    }),
    redisClient.set(redisKeys.csrfToken(userId), csrfToken, {
      EX: REFRESH_TOKEN_DURATION_SECONDS,
    }),
  ]);
};

export const setStatusActive = async (userId: string): Promise<void> => {
  logger.info(`[server][auth] Updating user status to ACTIVE: user=${userId}`);
  await userRepo.update(userId, { status: UserStatus.ACTIVE });
};

export const generateAuthTokens = (payload: UserPayload, req?: any) => {
  logger.info(`[server][auth] Generating auth tokens`);

  audit(req).action(AuditAction.TOKEN_GENERATION).step('starting token generation');

  const accessToken = generateToken(
    payload,
    process.env.JWT_ACCESS_TOKEN_EXPIRATION as unknown as StringValue
  );
  const refreshToken = generateToken(
    payload,
    process.env.JWT_REFRESH_TOKEN_EXPIRATION as unknown as StringValue,
  );

  logger.info(`[server][auth] Tokens generated successfully`);

  audit(req).step('tokens generated successfully').metadata({
    accessTokenIssued: true,
    refreshTokenIssued: true,
  });

  return { accessToken, refreshToken };
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  if (!refreshToken) {
    throw new AppError(t("refresh_token_missing"), 400);
  }

  let decoded: any;
  try {
    decoded = verifyToken(refreshToken, true);
  } catch (err) {
    logger.error(`[server][auth] Invalid refresh token`);
    throw new AppError(t("not_token"), 401);
  }

  const userId = decoded.id;
  if (!userId) {
    throw new AppError(t("invalid_token"), 400);
  }

  logger.info(`[server][auth] Logging out user ${userId}`);

  // Delete cached tokens and CSRF token
  await Promise.all([
    redisClient.del(redisKeys.refreshToken(userId)),
    redisClient.del(redisKeys.csrfToken(userId)),
  ]);

  logger.info(`[server][auth] Cleared cached tokens for user ${userId}`);

  // Update status to Inactive
  await userRepo.update(userId, { status: UserStatus.INACTIVE });

  logger.info(`[server][auth] User status set to OFFLINE: ${userId}`);
};

export const generateCsrfForUser = async (
  accessToken: string
): Promise<string> => {
  if (!accessToken) {
    throw new AppError(t("not_token"), 400);
  }

  let decoded: any;
  try {
    decoded = verifyToken(accessToken);
  } catch (err) {
    logger.error(`[server][auth] Invalid access token`);
    throw new AppError(t("invalid_token"), 400);
  }

  const userId = decoded.id;
  if (!userId) {
    throw new AppError(t("user_not_found"), 400);
  }

  logger.info(`[server][auth] Generating CSRF token for user ${userId}`);

  const csrfToken = crypto.randomBytes(32).toString("hex");

  // Store in Redis for 15 minutes
  await redisClient.set(redisKeys.csrfToken(userId), csrfToken, {
    EX: CSRF_TOKEN_EXPIRES,
  });

  logger.info(`[server][auth] CSRF token cached in Redis for user ${userId}`);

  return csrfToken;
};

export const getRefreshTokenById = async (
  userId: string
): Promise<string | {}> => {
  if (!userId) throw new AppError(t("invalid_input"), 400);

  // Check if refresh token exists in Redis
  const refreshToken = await redisClient.get(redisKeys.refreshToken(userId));
  if (!refreshToken) {
    throw new AppError(t("not_token"), 404);
  }

  // Update user status to ACTIVE
  await userRepo.update(userId, { status: UserStatus.ACTIVE });
  logger.info(`[server][auth] User status set to ACTIVE: ${userId}`);

  return refreshToken;
};

export const forgetPassword = async (
  email: string,
  req?: any,
): Promise<{ oid: string; otp: string }> => {
  if (!email) throw new AppError(t('email_required'), 400);

  const user = await userRepo.findOne({ where: { email } });

  if (!user) {
    audit(req).step('user not found for password reset');
    throw new AppError(t('user_not_found'), 404);
  }

  audit(req).resource('USER', user.id).step('user located for password reset');

  const oid = crypto.randomUUID();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await redisClient.set(
    redisKeys.forgetPassword(oid),
    JSON.stringify({ otp, userId: user.id }),
    { EX: FORGET_PASSWORD_EXPIRE },
  );

  audit(req).step('otp stored in redis').metadata({ oid });

  logger.info(
    `[server][auth] Forget password OTP generated for user ${user.id}: ${otp} (OID: ${oid})`,
  );

  const html = `
    <p>Hello user,</p>
    <p>You requested a password reset. Your OTP is:</p>
    <h2>${otp}</h2>
    <p>This OTP will expire in 3 minutes.</p>
  `;

  await sendMail(user.email, 'Your Password Reset OTP', html).catch((err) =>
    logger.warn(`[server] [auth] couldn't send email, skipping... ${err}`),
  );

  audit(req).step("password reset email sent");

  return { oid, otp };
};

export const verifyOtp = async (
  oid: string,
  otp: string,
  req?: any,
): Promise<string> => {
  if (!oid || !otp) throw new AppError(t('invalid_input'), 400);

  const dataStr = await redisClient.get(redisKeys.forgetPassword(oid));

  if (!dataStr) {
    audit(req).step('otp expired or not found');
    throw new AppError(t('otp_expired'), 400);
  }

  const data = JSON.parse(dataStr as string);

  if (data.otp !== otp) {
    audit(req).step('otp mismatch');
    throw new AppError(t('otp_invalid'), 400);
  }

  const resetToken = crypto.randomUUID();

  await redisClient.set(`${RESET_TOKEN_PREFIX}${resetToken}`, data.userId, {
    EX: RESET_TOKEN_EXPIRE,
  });

  await redisClient.del(redisKeys.forgetPassword(oid));

  audit(req)
    .resource('USER', data.userId)
    .step('otp verified')
    .metadata({ resetTokenIssued: true });

  logger.info(
    `[server][auth] OTP verified successfully for OID ${oid}, reset token generated`,
  );

  return resetToken;
};

export const resetPassword = async (
  resetToken: string,
  newPassword: string,
  req?: any,
): Promise<{ is_updated: boolean; message?: string; error?: string }> => {
  if (!resetToken || !newPassword) throw new AppError(t('invalid_input'), 400);

  if (!PASSWORD_REGEX.test(newPassword)) {
    audit(req).step("password validation failed");
    return { is_updated: false, error: t('invalid_password') };
  }

  const userId = await redisClient.get(`${RESET_TOKEN_PREFIX}${resetToken}`);

  if (!userId) {
    audit(req).step('invalid or expired reset token');
    return { is_updated: false, error: t('user_not_found') };
  }

  const hashedPassword = await hashPassword(newPassword);

  await userRepo.update(userId, { password: hashedPassword });

  await redisClient.del(`${RESET_TOKEN_PREFIX}${resetToken}`);

  audit(req)
    .resource('USER', userId as string)
    .step('password updated successfully');

  logger.info(`[server][auth] Password reset successfully for user ${userId}`);

  return { is_updated: true, message: t('password_updated') };
};

export const resetProfilePassword = async (
  newPassword: string,
  userId: string,
  auditLog?: ReturnType<typeof audit>
): Promise<{ is_updated: boolean; message?: string; error?: string }> => {
  if (!newPassword) {
    auditLog?.metadata({ status: "invalid_input" }).step("Password not provided");
    throw new AppError(t('invalid_input'), 400);
  }
  if (!PASSWORD_REGEX.test(newPassword)) {
    auditLog?.metadata({ status: "invalid_password" }).step("Password failed validation");
    return { is_updated: false, error: t('invalid_password') };
  }

  // Retrieve userId directly from reset token
  if (!userId) {
    auditLog?.metadata({ status: "user_not_found" }).step("User ID not provided");
    return { is_updated: false, error: t('user_not_found') };
  }

  const hashedPassword = await hashPassword(newPassword);
  await userRepo.update(userId, { password: hashedPassword });

  auditLog?.metadata({ status: "success" }).step("Password hashed and saved");
  logger.info(`[server][auth] Password reset successfully for user ${userId}`);

  return { is_updated: true, message: t('password_updated') };
};
