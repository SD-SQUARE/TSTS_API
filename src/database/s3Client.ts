import { S3Client } from "@aws-sdk/client-s3";

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
});
