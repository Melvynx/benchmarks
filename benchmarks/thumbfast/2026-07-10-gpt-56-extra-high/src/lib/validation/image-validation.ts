/**
 * Shared image validation utilities
 * Used across person, inspiration, and other image upload features
 */

import { ActionError } from "@/lib/errors/action-error";

export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_IMAGE_SIZE_MB = 2;

const BLOCKED_IMAGE_TYPES = ["image/svg+xml", "image/gif"] as const;
const BLOCKED_EXTENSIONS = [".svg", ".gif"] as const;

export type ImageValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Validates an image file for upload
 * @throws ActionError if validation fails
 */
export function validateImageFile(file: File): void {
  // Check blocked types
  if (
    BLOCKED_IMAGE_TYPES.includes(
      file.type as (typeof BLOCKED_IMAGE_TYPES)[number],
    )
  ) {
    throw new ActionError("SVG and GIF files are not allowed");
  }

  // Check blocked extensions
  const fileName = file.name.toLowerCase();
  for (const ext of BLOCKED_EXTENSIONS) {
    if (fileName.endsWith(ext)) {
      throw new ActionError("SVG and GIF files are not allowed");
    }
  }

  // Check file size
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new ActionError(`File too large (max ${MAX_IMAGE_SIZE_MB}MB)`);
  }
}

/**
 * Validates an image file and returns a result object instead of throwing
 */
export function validateImageFileSafe(file: File): ImageValidationResult {
  try {
    validateImageFile(file);
    return { valid: true };
  } catch (error) {
    if (error instanceof ActionError) {
      return { valid: false, error: error.message };
    }
    return { valid: false, error: "Invalid image file" };
  }
}
