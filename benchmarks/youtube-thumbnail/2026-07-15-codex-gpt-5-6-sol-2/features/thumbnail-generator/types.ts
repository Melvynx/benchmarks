export const THUMBNAIL_COUNTS = [1, 2, 3, 4] as const;

export type ThumbnailCount = (typeof THUMBNAIL_COUNTS)[number];
export type UploadGroup = "extra" | "inspiration" | "persons";

export interface UploadedImage {
  id: string;
  name: string;
  dataUrl: string;
  mediaType: string;
  size: number;
}

export type UploadsByGroup = Record<UploadGroup, UploadedImage[]>;

export interface GeneratedImagePayload {
  data: string;
  mediaType: string;
}

export interface GeneratedThumbnail extends GeneratedImagePayload {
  id: string;
}

export interface GenerateSuccessResponse {
  images: GeneratedImagePayload[];
  warning?: string;
}

export interface GenerateErrorResponse {
  error: string;
}

export type GenerationState =
  | { status: "idle"; images: GeneratedThumbnail[] }
  | { status: "loading"; images: GeneratedThumbnail[]; pendingCount: ThumbnailCount }
  | { status: "success"; images: GeneratedThumbnail[] }
  | { status: "error"; images: GeneratedThumbnail[]; message: string };
