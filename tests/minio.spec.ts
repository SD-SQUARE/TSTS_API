import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

import { s3Client } from "../src/database/s3Client";
import { Readable } from "stream";

const bucket = process.env.MINIO_BUCKET!;
const testKey = "test-file.txt";
const testContent = "Hello MinIO Test!";
const encoder = new TextEncoder();

describe("MinIO S3 SDK Tests", () => {
  beforeAll(async () => {
    // Create bucket IF NOT EXISTS
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  });

  test("Upload file", async () => {
    const result = await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: encoder.encode(testContent),
      })
    );

    expect(result.$metadata.httpStatusCode).toBe(200);
  });

  test("List files", async () => {
    const result = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucket })
    );

    const exists = result.Contents?.some((item) => item.Key === testKey);
    expect(exists).toBe(true);
  });

  test("Download file", async () => {
    const response = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: testKey })
    );

    const stream = response.Body as Readable;

    let data = "";
    for await (const chunk of stream) {
      data += chunk.toString();
    }

    expect(data).toBe(testContent);
  });

  test("Delete file", async () => {
    const result = await s3Client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: testKey })
    );

    expect(result.$metadata.httpStatusCode).toBe(204);
  });
});
