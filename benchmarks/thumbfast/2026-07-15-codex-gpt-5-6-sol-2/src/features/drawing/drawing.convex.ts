import { makeFunctionReference } from "convex/server";
import type { InspirationListItem } from "../inspiration/inspiration.query";
import type { DrawingDocument } from "./drawing-document";

export type DrawingInspirationDetail = {
  id: string;
  name: string;
  previewUrl: string;
  drawingDocument: DrawingDocument;
  updatedAt: string;
};

export const drawingInspirationDetailRef = makeFunctionReference<
  "query",
  { orgSlug: string; inspirationId: string },
  DrawingInspirationDetail
>("inspiration:drawingDetail");

export const createDrawingInspirationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    title: string;
    previewUrl: string;
    drawingDocument: DrawingDocument;
  },
  InspirationListItem
>("inspiration:createDrawing");

export const updateDrawingInspirationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    title: string;
    previewUrl: string;
    drawingDocument: DrawingDocument;
  },
  InspirationListItem
>("inspiration:updateDrawing");

export const uploadDrawingImageRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    bytes: ArrayBuffer;
    fileName: string;
    contentType: string;
  },
  string
>("inspirationActions:uploadImage");
