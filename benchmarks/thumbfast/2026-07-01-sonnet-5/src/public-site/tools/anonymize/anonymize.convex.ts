import { makeFunctionReference } from "convex/server";

export const anonymizeToolRef = makeFunctionReference<
  "action",
  | {
      orgSlug: string;
      type: "youtube";
      youtubeUrl: string;
    }
  | {
      orgSlug: string;
      type: "upload";
      bytes: ArrayBuffer;
      fileName: string;
      contentType: string;
    },
  { sourceImageUrl: string; anonymizedUrl: string }
>("inspirationActions:anonymizeTool");
