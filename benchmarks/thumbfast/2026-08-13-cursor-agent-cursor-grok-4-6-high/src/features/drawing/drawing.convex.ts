import type { InspirationListItem } from "@/features/inspiration/inspiration.query";
import { makeFunctionReference } from "convex/server";

export const createDrawingInspirationRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    bytes: ArrayBuffer;
    drawingData: string;
    title: string;
    description: string;
    hasPlaceholder?: boolean;
  },
  InspirationListItem
>("inspirationActions:createFromDrawing");

export const updateDrawingInspirationRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    inspirationId: string;
    bytes: ArrayBuffer;
    drawingData: string;
    title: string;
    description: string;
    hasPlaceholder?: boolean;
  },
  InspirationListItem
>("inspirationActions:updateFromDrawing");
