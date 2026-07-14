import { z } from "zod";

export const CreateApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
});

export const DeleteApiKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
});

export const RotateApiKeySchema = z.object({
  keyId: z.string().min(1, "Key ID is required"),
});
