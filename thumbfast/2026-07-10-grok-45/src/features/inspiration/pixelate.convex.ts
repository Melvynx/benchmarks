import { makeFunctionReference } from "convex/server";

export const uploadPixelatedImageRef = makeFunctionReference<
  "action",
  {
    orgSlug: string;
    imageDataUrl: string;
    originalUrl: string;
  },
  string
>("inspirationActions:uploadPixelatedImage");
