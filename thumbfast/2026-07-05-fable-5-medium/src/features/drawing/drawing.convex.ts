import type { InspirationListItem } from "@/features/inspiration/inspiration.query";
import { makeFunctionReference } from "convex/server";

export const createDrawingInspirationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    title: string;
    previewUrl: string;
    drawing: string;
  },
  InspirationListItem
>("inspiration:createDrawing");

export const updateDrawingInspirationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    title?: string;
    previewUrl: string;
    drawing: string;
  },
  InspirationListItem
>("inspiration:updateDrawing");

export const getDrawingInspirationRef = makeFunctionReference<
  "query",
  { orgSlug: string; inspirationId: string },
  { id: string; title: string; drawing: string }
>("inspiration:getDrawing");

export const uploadDrawingPreviewRef = makeFunctionReference<
  "action",
  { orgSlug: string; imageDataUrl: string },
  string
>("inspirationActions:uploadDrawingPreview");
