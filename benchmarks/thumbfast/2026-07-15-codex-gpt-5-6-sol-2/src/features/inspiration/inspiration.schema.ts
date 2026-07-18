import { z } from "zod";
import { isValidYoutubeUrl } from "./youtube-utils";

export const InspirationYoutubeSchema = z.object({
  type: z.literal("youtube"),
  youtubeUrl: z
    .string()
    .min(1, "YouTube URL is required")
    .refine(isValidYoutubeUrl, "Invalid YouTube URL"),
  anonymize: z.boolean().optional(),
  anonymizeSubject: z.boolean().optional(),
  anonymizeText: z.boolean().optional(),
  anonymizeLogos: z.boolean().optional(),
});

export const InspirationUploadSchema = z.object({
  type: z.literal("upload"),
  imageUrls: z.array(z.string()).min(1, "At least one image is required"),
  anonymize: z.boolean().optional(),
  anonymizeSubject: z.boolean().optional(),
  anonymizeText: z.boolean().optional(),
  anonymizeLogos: z.boolean().optional(),
});

export const CreateInspirationSchema = z.discriminatedUnion("type", [
  InspirationYoutubeSchema,
  InspirationUploadSchema,
]);

export type CreateInspirationInput = z.infer<typeof CreateInspirationSchema>;

export const UpdateInspirationSchema = z.object({
  inspirationId: z.string(),
  aiDescription: z.string().min(1, "Description is required"),
});

export type UpdateInspirationInput = z.infer<typeof UpdateInspirationSchema>;

export const UpdateInspirationImagesSchema = z.object({
  inspirationId: z.string(),
  thumbnailUrls: z.array(z.string()).min(1, "At least one image is required"),
  isPublic: z.boolean(),
});

export type UpdateInspirationImagesInput = z.infer<
  typeof UpdateInspirationImagesSchema
>;

export const AnonymizeInspirationSchema = z.object({
  inspirationId: z.string(),
  mode: z.enum(["replace", "duplicate"]),
});

export const UpdateInspirationNameSchema = z.object({
  inspirationId: z.string(),
  name: z.string().min(1, "Name is required"),
});
