import type { UploadedImage } from "@/features/thumbnail-generator/types";

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_IMAGE_INPUT = ACCEPTED_IMAGE_TYPES.join(",");
export const MAX_FILE_SIZE = 4 * 1024 * 1024;
export const MAX_TOTAL_UPLOAD_SIZE = 7 * 1024 * 1024;

interface FileValidationResult {
  acceptedFiles: File[];
  rejectionMessages: string[];
}

export function validateImageFiles(
  files: File[],
  currentTotalSize: number,
  availableSlots: number,
): FileValidationResult {
  const acceptedFiles: File[] = [];
  const rejectionMessages: string[] = [];
  let nextTotalSize = currentTotalSize;

  for (const file of files) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      rejectionMessages.push(`${file.name} is not a JPEG, PNG, or WebP image.`);
      continue;
    }

    if (file.size > MAX_FILE_SIZE) {
      rejectionMessages.push(`${file.name} is larger than 4 MB.`);
      continue;
    }

    if (acceptedFiles.length >= availableSlots) {
      rejectionMessages.push("This upload area has reached its image limit.");
      continue;
    }

    if (nextTotalSize + file.size > MAX_TOTAL_UPLOAD_SIZE) {
      rejectionMessages.push("Selected images exceed the 7 MB combined upload limit.");
      continue;
    }

    acceptedFiles.push(file);
    nextTotalSize += file.size;
  }

  return { acceptedFiles, rejectionMessages };
}

export async function fileToUploadedImage(file: File): Promise<UploadedImage> {
  const dataUrl = await readFileAsDataUrl(file);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    dataUrl,
    mediaType: file.type,
    size: file.size,
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The selected image could not be read."));
    });
    reader.addEventListener("error", () => {
      reject(new Error(`Could not read ${file.name}.`));
    });
    reader.readAsDataURL(file);
  });
}
