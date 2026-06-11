// storage.service.ts
import { s3Client } from "../database/s3Client.js";
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import logger from "./logger.js";

/**
 * Uploads a file to an S3 bucket.
 * @param {string} bucket - The name of the S3 bucket to upload to.
 * @param {string} key - The key of the object to upload.
 * @param {Buffer} buffer - The Buffer of the file to upload.
 * @param {string} contentType - The MIME type of the object to upload.
 * @example
 * const buffer = await fs.promises.readFile('file.txt');
 * const result = await uploadFile('my-bucket', 'file.txt', buffer, 'text/plain');
 * console.log(result); // Output: File uploaded: file.txt
 * @returns {Promise<string>} - A promise that resolves with a string indicating the file was uploaded successfully.
 */
export const uploadFile = async (
  bucket: string,
  key: string,
  buffer: Buffer,
  contentType: string
) => {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
};

/**
 * Downloads a file from an S3 bucket as a Readable stream.
 * @param {string} bucket - The name of the S3 bucket to download from.
 * @param {string} key - The key of the object to download.
 * @returns {Promise<Readable>} - A promise that resolves with a Readable stream of the file.
 * @example
 * const stream = await getFileStream('my-bucket', 'file.txt');
 * const fileBuffer = await streamToBuffer(stream);
 * console.log(fileBuffer); // Output: The contents of file.txt as a Buffer
 */
export const getFileStream = async (bucket: string, key: string) => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  return response.Body as Readable;
};

/**
 * Deletes a file from an S3 bucket.
 * @param {string} bucket - The name of the S3 bucket to delete from.
 * @param {string} key - The key of the object to delete.
 * @returns {Promise<string>} - A promise that resolves with a string indicating the file was deleted successfully.
 * @example
 * const result = await deleteFile('my-bucket', 'file.txt');
 * console.log(result); // Output: File deleted: file.txt
 */
export const deleteFile = async (bucket: string, key: string) => {
  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  return `File deleted: ${key}`;
};

/**
 * Lists all the files in an S3 bucket.
 * @param {string} bucket - The name of the S3 bucket to list files from.
 * @returns {Promise<string[]>} - A promise that resolves with an array of file keys.
 * @example
 * const files = await listFiles('my-bucket');
 * console.log(files); // Output: ['file1.txt', 'file2.txt']
 */
export const listFiles = async (bucket: string) => {
  const command = new ListObjectsV2Command({ Bucket: bucket });
  const response = await s3Client.send(command);
  return response.Contents?.map((obj) => obj.Key!) || [];
};

/**
 * Downloads a file from an S3 bucket.
 * @param {string} bucket - The name of the S3 bucket to download from.
 * @param {string} key - The key of the object to download.
 * @returns {Promise<Readable>} - A promise that resolves with a Readable stream of the file.
 * @example
 * const stream = await downloadFile('my-bucket', 'file.txt');
 * const fileBuffer = await streamToBuffer(stream);
 * console.log(fileBuffer); // Output: The contents of file.txt as a Buffer
 */
export const downloadFile = async (bucket: string, key: string) => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);
  return response.Body as Readable;
};

/**
 * Generates a presigned URL for downloading a file from an S3 bucket.
 * The URL is valid for a specified number of seconds.
 * @param {string} bucket - The name of the S3 bucket to download from.
 * @param {string} key - The key of the object to download.
 * @param {number} [expiresIn] - The number of seconds the URL is valid for. Defaults to 60.
 * @returns {Promise<string>} - A promise that resolves with the presigned URL.
 * @example
 * const url = await getPresignedUrl('my-bucket', 'file.txt');
 * console.log(url); // Output: A presigned URL for downloading file.txt from my-bucket
 */
export const getPresignedUrl = async (
  bucket: string,
  key: string,
  expiresIn: number = 60
) => {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const url = await getSignedUrl(s3Client, command, { expiresIn }); // URL valid for 60 seconds
  if (!url) {
    throw new Error("Failed to generate presigned URL");
  }
  
  
  return url;
};



export const ensureBucketExists = async (bucket: string) => {
  try {
    // Check if bucket exists
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    logger.info(`✅ Bucket "${bucket}" already exists`);
  } catch (err: any) {
    if (err.$metadata?.httpStatusCode === 404) {
      logger.warn(`⚠️ Bucket "${bucket}" not found. Creating...`);

      await s3Client.send(
        new CreateBucketCommand({
          Bucket: bucket,
        })
      );

      logger.info(`✅ Bucket "${bucket}" created`);
    } else {
      throw err;
    }
  }
};