import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!key || key.length < 32) {
    throw new Error(
      "API_KEY_ENCRYPTION_SECRET must be set and at least 32 characters",
    );
  }
  return Buffer.from(key.slice(0, 32));
}

export function encryptApiKey(plainText: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

export function decryptApiKey(encryptedText: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedText, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) {
    return "****";
  }
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-4);
  return `${prefix}****${suffix}`;
}
