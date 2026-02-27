// import fs from "fs";
// import https from "https";
import { S3Client } from "@aws-sdk/client-s3";

// import { NodeHttpHandler } from "@aws-sdk/node-http-handler";


// const caCert = fs.readFileSync(process.env.MINIO_CA_CERT || "ca.crt");
const ENDPOINT = `${process.env.MINIO_PROTOCOL}://${process.env.MINIO_HOST}:${process.env.MINIO_API_PORT}`;
const ENDPOINT_FALLBACK = "http://localhost:9000";

export const s3Client = new S3Client({
  endpoint: ENDPOINT ?? ENDPOINT_FALLBACK,
  region: process.env.MINIO_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_USER || "minioadmin",
    secretAccessKey: process.env.MINIO_PASSWORD || "minioadmin123",
  },
  forcePathStyle: true,
  // requestHandler: new NodeHttpHandler({
  //   httpsAgent: new https.Agent({
  //     ca: caCert, // trust mkcert CA
  //   }),
  // }),
});
