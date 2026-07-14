import type { DrawingSceneData } from "@/features/drawing/drawing.types";
import type { InspirationListItem } from "./inspiration.query";
import { makeFunctionReference } from "convex/server";

export const createInspirationRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    type: "youtube" | "upload";
    youtubeUrl?: string;
    imageUrls?: string[];
    anonymize?: boolean;
    anonymizeSubject?: boolean;
    anonymizeText?: boolean;
    anonymizeLogos?: boolean;
  },
  InspirationListItem
>("inspirationActions:create");

export const uploadInspirationImageRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    bytes: ArrayBuffer;
    fileName: string;
    contentType: string;
  },
  string
>("inspirationActions:uploadImage");

export const deleteInspirationRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; inspirationId: string },
  { success: boolean }
>("inspiration:deleteOne");

export const updateInspirationNameRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; inspirationId: string; name: string },
  { id: string; name: string }
>("inspiration:updateName");

export const updateInspirationImagesRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    thumbnailUrls: string[];
    isPublic?: boolean;
  },
  InspirationListItem
>("inspiration:updateImages");

export const copyInspirationRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; inspirationId: string },
  InspirationListItem
>("inspiration:copy");

export const anonymizeInspirationRef = makeFunctionReference<
  "action",
  { orgSlug: string; inspirationId: string; mode: "replace" | "duplicate" },
  InspirationListItem
>("inspirationActions:anonymize");

export const createFromDrawingRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    previewImageDataUrl: string;
    templateName?: string;
    drawing: DrawingSceneData;
  },
  InspirationListItem
>("inspirationActions:createFromDrawing");

export const uploadDrawingPreviewRef = makeFunctionReference<
  "action",
  { orgSlug: string; imageDataUrl: string },
  string
>("inspirationActions:uploadDrawingPreview");

export const updateDrawingRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    previewUrl: string;
    drawing: DrawingSceneData;
    hasPlaceholder?: boolean;
  },
  InspirationListItem
>("inspiration:updateDrawing");
