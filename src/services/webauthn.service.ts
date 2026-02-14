import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import type { VerifiedRegistrationResponse } from "@simplewebauthn/server";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { TrustedDevice } from "../entities/TrustedDevice.js";
const RP_NAME = "My App";
const RP_ID = process.env.RP_ID ?? "localhost";
const ORIGIN = process.env.RP_ORIGIN ?? "http://localhost:3000";


const deviceRepo = PostgresDataSource.getRepository(TrustedDevice);

export const generateRegisterOptions = async (user: {
  id: string;
  email: string;
}) => {
  /// 1️⃣ Get existing trusted devices for this user
  const existingDevices = await deviceRepo.find({
    where: { user: { id: user.id }, isActive: true },
  });

  // 2️⃣ Map existing devices to excludeCredentials (base64url string!)
  const excludeCredentials = existingDevices.map((device) => ({
    id: device.credentialId,
    type: "public-key" as const,
  }));

  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: {
      userVerification: "required",
    },
    excludeCredentials,
  });
};

export const verifyRegisterResponse = async (
  response: any,
  expectedChallenge: string
): Promise<VerifiedRegistrationResponse> => {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
  });
};
