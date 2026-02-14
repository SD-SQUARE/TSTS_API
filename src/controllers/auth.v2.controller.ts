import { Request, Response } from "express";

import { loginUser, findByEmail, generateAuthTokens } from "../services/auth.service.js";
import { generateAuthenticationOptions,verifyAuthenticationResponse } from "@simplewebauthn/server";
import { AppError } from "../utils/AppError.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { TrustedDevice } from "../entities/TrustedDevice.js";



const deviceRepo = PostgresDataSource.getRepository(TrustedDevice);

export const loginV2 = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await findByEmail(email);
  if (!user) throw new AppError("Invalid credentials", 400);

  await loginUser(email, password);

  const devicesCount = await deviceRepo.count({
    where: { user: { id: user.id }, isActive: true },
  });

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

    const { accessToken, refreshToken } = generateAuthTokens(payload);

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
  return res.json({
    step: "TRUSTED_DEVICE_REQUIRED",
    userId: user.id,
  });
};



export const getAuthOptions = async (req: any, res: any) => {
  const { userId } = req.body;



  const options = await generateAuthenticationOptions({
    rpID: process.env.RP_ID! ?? "localhost",
    userVerification: "required",

    timeout: 60000,
  });

  // store challenge securely
  req.session.webauthnChallenge = {
    challenge: options.challenge,
    userId,
  };

  return res.json(options);
};

export const verifyAuthOptions = async (req: any, res: any) => {
  const { credential } = req.body;
  const user = req.user;

  const sessionData = req.session.webauthnChallenge;
  if (!sessionData) {
    return res.status(400).json({ message: "Missing WebAuthn session" });
  }

  const { challenge, userId } = sessionData;

  const device = await deviceRepo.findOne({
    where: { credentialId: Buffer.from(credential.id).toString("base64url"), user: { id: userId } },
    relations: ["user"],
  });

  if (!device) {
    return res.status(400).json({ message: "Unknown device" });
  }

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
    return res.status(401).json({ message: "Device verification failed" });
  }

  // 🔐 Update counter
  device.counter = verification.authenticationInfo!.newCounter;
  await deviceRepo.save(device);

  // ✅ Issue tokens (reuse v1 logic)
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

  const { accessToken, refreshToken } = generateAuthTokens(payload);

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  // cleanup
  req.session.webauthn = null;

  return res.json({
    access_token: accessToken,
    permissions: device.user.userDepartments || [],
  });
};