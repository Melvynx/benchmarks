import { PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
import { logger } from "../logger";
import { s3 } from "./aws-s3-client";

export async function uploadFileToS3(params: {
  file: File;
  prefix: string;
  contentType?: string;
  fileName?: string;
}) {
  const fileBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  const fileExtension = params.file.name.split(".").pop();
  const uniqueFileName = `${params.prefix}/${params.fileName ?? Date.now()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: uniqueFileName,
    Body: buffer,
    ContentType: params.contentType ?? params.file.type,
  });

  try {
    await s3.send(command);
  } catch (error) {
    logger.error("Invalid s3 client send", error);
    return;
  }

  return `${getR2PublicUrl()}/${uniqueFileName}`;
}

/**
 * Upload a file from a URL directly to S3
 */
export async function uploadFileFromURLToS3(params: {
  url: string;
  prefix: string;
  fileName: string;
}): Promise<string | null> {
  try {
    const response = await fetch(params.url);
    if (!response.ok) {
      logger.error(`Failed to fetch URL: ${params.url}`);
      return null;
    }

    const contentType =
      response.headers.get("content-type") ?? "application/octet-stream";
    const fileExtension = mime.extension(contentType) || "bin";
    const buffer = await response.arrayBuffer();

    const uniqueFileName = `${params.prefix}/${params.fileName}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: uniqueFileName,
      Body: Buffer.from(buffer),
      ContentType: contentType,
    });

    await s3.send(command);
    return `${getR2PublicUrl()}/${uniqueFileName}`;
  } catch (error) {
    logger.error(`Error uploading file from URL: ${params.url}`, error);
    return null;
  }
}

export async function uploadBufferToS3(params: {
  buffer: Buffer;
  prefix: string;
  fileName: string;
  contentType: string;
}): Promise<string | null> {
  const extension = params.contentType.split("/")[1] ?? "png";
  const uniqueFileName = `${params.prefix}/${params.fileName}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: uniqueFileName,
    Body: params.buffer,
    ContentType: params.contentType,
  });

  try {
    await s3.send(command);
    return `${getR2PublicUrl()}/${uniqueFileName}`;
  } catch (error) {
    logger.error("Failed to upload buffer to S3", error);
    return null;
  }
}

function getR2BucketName() {
  const bucket = process.env.R2_S3_BUCKET_NAME;
  if (!bucket) throw new Error("R2_S3_BUCKET_NAME is not configured");
  return bucket;
}

function getR2PublicUrl() {
  const url = process.env.R2_URL;
  if (!url) throw new Error("R2_URL is not configured");
  return url;
}
