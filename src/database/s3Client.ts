import fs from "fs";
import https from "https";
import { S3Client } from "@aws-sdk/client-s3";

import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

const ENDPOINT = `${process.env.MINIO_PROTOCOL}://${process.env.MINIO_HOST}:${process.env.MINIO_API_PORT}`;
const ENDPOINT_FALLBACK = "http://localhost:9000";

// Only load CA cert if using HTTPS and cert file is specified
const isHttps = process.env.MINIO_PROTOCOL === "https";
const certPath = process.env.MINIO_CA_CERT;
const caCert =
  isHttps && certPath && fs.existsSync(certPath)
    ? fs.readFileSync(certPath)
    : undefined;

export const s3Client = new S3Client({
  endpoint: ENDPOINT ?? ENDPOINT_FALLBACK,
  region: process.env.MINIO_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_USER || "minioadmin",
    secretAccessKey: process.env.MINIO_PASSWORD || "minioadmin123",
  },
  forcePathStyle: true,
  ...(isHttps && caCert
    ? {
        requestHandler: new NodeHttpHandler({
          httpsAgent: new https.Agent({
            ca: caCert,
          }),
        }),
      }
    : {}),
});
