import { Request, Response } from "express";

import { loginUser, findByEmail, generateAuthTokens } from "../services/auth.service.js";
import { generateAuthenticationOptions,verifyAuthenticationResponse } from "@simplewebauthn/server";
import { AppError } from "../utils/AppError.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { TrustedDevice } from "../entities/TrustedDevice.js";
import { audit } from "../helpers/auditBuilder.js";
import { AuditAction } from "../enums/AuditAction.enum.js";
import { t } from "i18next";



const deviceRepo = PostgresDataSource.getRepository(TrustedDevice);

export const loginV2 = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  audit(req)
    .summary('User login attempt')
    .action(AuditAction.USER_LOGIN)
    .metadata({ email })
    .step('login request received');

  const user = await findByEmail(email);

  if (!user) {
    audit(req).step('user not found').metadata({ reason: 'invalid_email' });

    throw new AppError(t('invalid_input'), 400);
  }

  audit(req).resource('USER', user.id).step('user found');

  await loginUser(email, password, req);

  const devicesCount = await deviceRepo.count({
    where: { user: { id: user.id }, isActive: true },
  });

  audit(req)
    .metadata({ trustedDevices: devicesCount })
    .step(`trusted devices count: ${devicesCount}`);

  // 🟢 NO trusted devices → login normally
  if (devicesCount === 0) {
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
    (req as any).user = payload;
    const { accessToken, refreshToken } = generateAuthTokens(payload);

    audit(req)
      .step('tokens generated')
      .summary('User logged in without trusted device')
      .metadata({ loginMethod: 'password_only' });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.json({
      step: "LOGGED_IN_NO_DEVICE",
      access_token: accessToken,
      permissions: user.userDepartments || [],
    });
  }

  // 🔐 Devices exist → require verification
  audit(req)
    .summary('Trusted device verification required')
    .metadata({ loginStep: 'DEVICE_VERIFICATION_REQUIRED' })
    .step('trusted device verification required');

  return res.json({
    step: 'TRUSTED_DEVICE_REQUIRED',
    userId: user.id,
  });
};



export const getAuthOptions = async (req: any, res: any) => {
  const { userId } = req.body;

  audit(req)
    .summary("Trusted device authentication challenge requested")
    .action(AuditAction.WEBAUTHN_AUTH_OPTIONS)
    .resource("USER", userId)
    .step("authentication options request received");

  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID! ?? "localhost",
    userVerification: "required",

    timeout: 60000,
  });

  audit(req)
    .step("authentication challenge generated")
    .metadata({
      challengeLength: options.challenge?.length,
      rpID: process.env.RP_ID ?? "localhost",
    });

  // store challenge securely
  req.session.webauthnChallenge = {
    challenge: options.challenge,
    userId,
  };

  audit(req)
    .step("challenge stored in session")
    .metadata({
      sessionStored: true,
    });

  return res.json(options);
};

export const verifyAuthOptions = async (req: any, res: any) => {
  const { credential } = req.body;
  const user = req.user;

  audit(req)
    .summary("Trusted device authentication verification")
    .action(AuditAction.WEBAUTHN_VERIFY)
    .resource("USER", user?.id)
    .step("device verification request received");

  const sessionData = req.session.webauthnChallenge;

  if (!sessionData) {
    audit(req)
      .step("missing webauthn session")
      .metadata({ reason: "missing_session" });

    return res.status(400).json({ message: "Missing WebAuthn session" });
  }

  const { challenge, userId } = sessionData;

  audit(req)
    .step("webauthn session found")
    .metadata({ userId });

  const device = await deviceRepo.findOne({
    where: {
      credentialId: Buffer.from(credential.id).toString("base64url"),
      user: { id: userId },
    },
    relations: ["user"],
  });

  if (!device) {
    audit(req)
      .step("device not found")
      .metadata({ credentialId: credential.id });

    return res.status(400).json({ message: "Unknown device" });
  }

  audit(req)
    .step("trusted device located")
    .resource("DEVICE", device.credentialId);

  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: process.env.RP_ORIGIN! ?? "http://localhost:3000",
    expectedRPID: process.env.RP_ID! ?? "localhost",
    credential: {
      id: device.credentialId,
      publicKey: new Uint8Array(device.publicKey as unknown as ArrayBuffer),
      counter: device.counter,
    },
  });

  if (!verification.verified) {
    audit(req)
      .step("device verification failed")
      .metadata({ verificationResult: false });

    return res.status(401).json({ message: "Device verification failed" });
  }

  audit(req)
    .step("device verification successful")
    .metadata({ verificationResult: true });

  // 🔐 Update counter
  device.counter = verification.authenticationInfo!.newCounter;
  await deviceRepo.save(device);

  audit(req).step("device counter updated");

  // ✅ Issue tokens
  const payload = {
    id: device.user.id,
    email: device.user.email,
    role: device.user.user_type,
    permission_profile: device.user.usersPermissions,
    name: {
      first: device.user.firstName,
      mid: device.user.midName,
      last: device.user.lastName,
    },
  };

  const { accessToken, refreshToken } = generateAuthTokens(payload, req);

  audit(req)
    .step("authentication tokens issued")
    .summary("User logged in via trusted device");

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  // cleanup
  req.session.webauthn = null;

  audit(req).step("webauthn session cleared");

  return res.json({
    access_token: accessToken,
    permissions: device.user.userDepartments || [],
  });
};