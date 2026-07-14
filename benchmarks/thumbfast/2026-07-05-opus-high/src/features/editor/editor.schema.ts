import type { AspectRatio } from "@/lib/ai/aspect-ratio";
import { getDefaultModelId, resolveModelId } from "@/lib/ai/image-models";
import { z } from "zod";

export const ImageModelSchema = z
  .string()
  .transform((val) => resolveModelId(val));

export const AspectRatioSchema = z
  .enum(["16:9", "9:16", "1:1"] as const)
  .default("16:9") as z.ZodType<AspectRatio>;

// UserImage data structure (from database)
export const UserImageDataSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export type UserImageData = z.infer<typeof UserImageDataSchema>;

export const PromptSchema = z.object({
  name: z.string().max(100).optional(),
  textPrompt: z.string().max(2000),
  personIds: z.array(z.string()).default([]),
  inspirationIds: z.array(z.string()).default([]),
  userImageIds: z.array(z.string()).default([]),
});

export type PromptFormData = z.infer<typeof PromptSchema>;

export const CreatePromptSchema = PromptSchema;

export const CreateAndGenerateSchema = PromptSchema;

export const EditorFormSchema = z.object({
  textPrompt: z.string().max(2000),
});

export const UpdatePromptNameSchema = z.object({
  promptId: z.string(),
  name: z.string().max(100),
});

export const GenerateSchema = z.object({
  promptId: z.string(),
  textPrompt: z.string().max(2000),
  personIds: z.array(z.string()).default([]),
  inspirationIds: z.array(z.string()).default([]),
  userImageIds: z.array(z.string()).default([]),
  baseImageUrl: z.string().optional(),
  baseThumbnailId: z.string().optional(),
  editPrompt: z.string().optional(),
});

export const UpdatePromptSchema = z.object({
  promptId: z.string(),
  textPrompt: z.string().max(2000),
});

export const CreatePromptWithPendingGenerationSchema = PromptSchema.extend({
  count: z.number().int().min(1).max(4).default(1),
  model: ImageModelSchema.default(getDefaultModelId()),
  aspectRatio: AspectRatioSchema,
});

export const CreatePendingGenerationSchema = z.object({
  promptId: z.string(),
  count: z.number().int().min(1).max(4).default(1),
  textPrompt: z.string().max(2000),
  personIds: z.array(z.string()).default([]),
  inspirationIds: z.array(z.string()).default([]),
  userImageIds: z.array(z.string()).default([]),
  baseImageUrl: z.string().optional(),
  baseThumbnailId: z.string().optional(),
  editPrompt: z.string().optional(),
  model: ImageModelSchema.default(getDefaultModelId()),
  aspectRatio: AspectRatioSchema,
});

export const GenerateSingleThumbnailSchema = z.object({
  generationId: z.string(),
});

export const CancelGenerationSchema = z.object({
  generationId: z.string(),
});
