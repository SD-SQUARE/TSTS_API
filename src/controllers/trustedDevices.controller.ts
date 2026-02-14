import { PostgresDataSource } from "../database/postgres-data-source.js";
import { TrustedDevice } from "../entities/TrustedDevice.js";
import {
  generateRegisterOptions,
  verifyRegisterResponse,
} from "../services/webauthn.service.js";

const deviceRepo = PostgresDataSource.getRepository(TrustedDevice);

/**
 * GET /trusted-devices
 */
export const listTrustedDevices = async (req: any, res: any) => {
  const userId = req.user.id;

  const devices = await deviceRepo.find({
    where: { user: { id: userId }, isActive: true },
    order: { activatedSince: "DESC" },
  });

  res.json(devices);
};

/**
 * POST /trusted-devices/options
 * Step 1: Get WebAuthn options
 */
export const getRegisterOptions = async (req: any, res: any) => {
  const user = req.user;

  const options = await generateRegisterOptions({
    id: user.id,
    email: user.email,
  });

  // store challenge in session / redis
  req.session.webauthnChallenge = options.challenge;

  res.json(options);
};

/**
 * POST /trusted-devices/verify
 * Step 2: Verify WebAuthn + create device
 */
export const verifyAndCreateDevice = async (req: any, res: any) => {
  const user = req.user;
  const { name, deviceType, browser, os, credential } = req.body;
  const ipAddress = req.ip;

  const expectedChallenge = req.session.webauthnChallenge;
  if (!expectedChallenge) {
    return res.status(400).json({ message: "Missing challenge" });
  }

  
  const verification = await verifyRegisterResponse(
    credential,
    expectedChallenge
  );

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ message: "Verification failed" });
  }
const registrationInfo = verification.registrationInfo;

if (!registrationInfo) {
  return res.status(400).json({ message: "Missing registration info" });
}

const credentialID = registrationInfo.credential.id;
const credentialPublicKeyCose = registrationInfo.credential.publicKey;
const counter = registrationInfo.credential.counter;

const credentialIdEncoded = Buffer.from(credential.id).toString("base64url");

// Check if already exists
const exists = await deviceRepo.findOne({
  where: { credentialId: credentialIdEncoded, user: { id: user.id } },
});

if (exists) {
  return res.status(409).json({ message: "Device already registered" });
}
  const device = deviceRepo.create({
    user,
    name,
    deviceType,
    browser,
    os,
    ipAddress   ,
    // 🔐 required for future authentication
    credentialId: credentialIdEncoded,
    publicKey: Buffer.from(credentialPublicKeyCose),
    counter,
  });

  await deviceRepo.save(device);

  delete req.session.webauthnChallenge;

  return res.status(201).json(device);
};

/**
 * DELETE /trusted-devices/:id
 */
export const removeTrustedDevice = async (req: any, res: any) => {
  const userId = req.user.id;
  const deviceId = req.params.id;

  await deviceRepo.delete(
    { id: deviceId, user: { id: userId } },
  );

  res.status(204).send();
};

export const adminListTrustedDevices = async (req: any, res: any) => {
  const { search = "", page = 1, pageSize = 10 } = req.query;

  const qb = PostgresDataSource.getRepository(TrustedDevice)
    .createQueryBuilder("device")
    .leftJoinAndSelect("device.user", "user")
    .where("device.isActive = true");

  if (search) {
    qb.andWhere(
      `(user.email ILIKE :search OR user.ssn ILIKE :search)`,
      { search: `%${search}%` }
    );
  }

  qb
    .orderBy("device.activatedSince", "DESC")
    .skip((+page - 1) * +pageSize)
    .take(+pageSize);

  const [data, total] = await qb.getManyAndCount();

  res.json({
    data,
    meta: {
      total,
      page: +page,
      pageSize: +pageSize,
    },
  });
};

export const deleteTrustedDevice = async (req: any, res: any) => {
  const { id } = req.params;

  await PostgresDataSource.getRepository(TrustedDevice).delete(id);

  res.status(204).send();
};
