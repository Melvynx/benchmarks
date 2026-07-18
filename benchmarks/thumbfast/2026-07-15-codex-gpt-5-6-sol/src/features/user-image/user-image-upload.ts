import { upfetch } from "@/lib/up-fetch";
import { validateImageFile } from "@/lib/validation/image-validation";
import { z } from "zod";

const UploadStorageResponseSchema = z.object({
  storageId: z.string(),
});

const UploadUserImageSchema = z.object({
  orgSlug: z.string().min(1),
  file: z.instanceof(File),
});

const UpdateUserImageNameSchema = z.object({
  orgSlug: z.string().min(1),
  id: z.string(),
  name: z.string().min(1),
});

type GenerateUploadUrl = () => Promise<string>;
type CreateUserImageFromUpload = (input: {
  orgSlug: string;
  storageId: string;
  name?: string;
  contentType?: string;
}) => Promise<{
  id: string;
  imageUrl: string;
  name: string;
  description: string | null;
}>;
type RenameUserImage = (input: {
  orgSlug: string;
  id: string;
  name: string;
}) => Promise<{ id: string; name: string }>;

export async function uploadUserImage(
  input: z.infer<typeof UploadUserImageSchema>,
  mutations: {
    generateUploadUrl: GenerateUploadUrl;
    createFromUpload: CreateUserImageFromUpload;
  },
) {
  const parsed = UploadUserImageSchema.parse(input);
  if (!parsed.file.type.startsWith("image/")) {
    throw new Error("Only images are allowed");
  }

  validateImageFile(parsed.file);

  const uploadUrl = await mutations.generateUploadUrl();
  const result = await upfetch<z.infer<typeof UploadStorageResponseSchema>>(
    uploadUrl,
    {
      method: "POST",
      headers: { "Content-Type": parsed.file.type },
      body: parsed.file,
      schema: UploadStorageResponseSchema,
    },
  );

  return mutations.createFromUpload({
    orgSlug: parsed.orgSlug,
    storageId: result.storageId,
    name: parsed.file.name.replace(/\.[^.]+$/, "") || "Image",
    contentType: parsed.file.type,
  });
}

export async function updateUserImageName(
  input: z.infer<typeof UpdateUserImageNameSchema>,
  rename: RenameUserImage,
) {
  const parsed = UpdateUserImageNameSchema.parse(input);
  return rename(parsed);
}
