import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_S3_URL,
  credentials: {
    accessKeyId: process.env.R2_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_S3_SECRET_ACCESS_KEY ?? "",
  },
  requestHandler: {
    requestTimeout: 10_000,
    connectionTimeout: 5_000,
  },
  maxAttempts: 3,
});
