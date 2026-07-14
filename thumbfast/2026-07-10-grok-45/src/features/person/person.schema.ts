import { z } from "zod";

export const PersonSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(1000),
});

export type PersonFormData = z.infer<typeof PersonSchema>;

export const CreatePersonSchema = PersonSchema.extend({
  images: z.array(z.string()).max(1, "Only one image is allowed per person"),
});

export const CreatePersonOnboardingSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const UpdatePersonSchema = PersonSchema.extend({
  personId: z.string(),
  images: z.array(z.string()).max(1, "Only one image is allowed per person"),
});

export const GeneratePersonDescriptionSchema = z.object({
  images: z
    .array(z.string())
    .min(1, "At least one image is required")
    .max(2, "Maximum 2 images allowed"),
});
