import { upfetch } from "@/lib/up-fetch";
import { validateImageFile } from "@/lib/validation/image-validation";
import { z } from "zod";

const UploadStorageResponseSchema = z.object({
  storageId: z.string(),
});

type GenerateUploadUrl = () => Promise<string>;
type CompleteImageUpload = (input: { storageId: string }) => Promise<string>;

export async function uploadImageFile(
  file: File,
  mutations: {
    generateUploadUrl: GenerateUploadUrl;
    completeImageUpload: CompleteImageUpload;
  },
) {
  if (!(file instanceof File)) {
    throw new Error("Invalid file (not a file)");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Invalid file (only images are allowed)");
  }

  validateImageFile(file);

  const uploadUrl = await mutations.generateUploadUrl();
  const result = await upfetch<z.infer<typeof UploadStorageResponseSchema>>(
    uploadUrl,
    {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
      schema: UploadStorageResponseSchema,
    },
  );

  return mutations.completeImageUpload({ storageId: result.storageId });
}
