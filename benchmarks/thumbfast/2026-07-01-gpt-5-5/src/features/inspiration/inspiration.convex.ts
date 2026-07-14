import type { InspirationListItem } from "./inspiration.query";
import { makeFunctionReference } from "convex/server";

export const createInspirationRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    type: "youtube" | "upload" | "drawing";
    youtubeUrl?: string;
    imageUrls?: string[];
    previewUrl?: string;
    title?: string;
    drawingDocument?: unknown;
    drawingTemplateId?: string;
    drawingHasPlaceholders?: boolean;
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

export const updateDrawingInspirationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    previewUrl: string;
    drawingDocument: unknown;
    drawingTemplateId?: string;
    hasPlaceholder?: boolean;
  },
  InspirationListItem
>("inspiration:updateDrawing");

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
