import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { analyzeYoutubeVideo } from "@/lib/ai/youtube-video";
import { tool } from "ai";
import { makeFunctionReference } from "convex/server";
import { z } from "zod";
import type { ToolContext } from "./types";

const createVideoRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    internalTitle: string;
    description?: string;
    youtubeUrl?: string;
    generationIds?: string[];
  },
  { id: string }
>("video:create");

export function createActionTools(ctx: ToolContext) {
  return {
    create_video: tool({
      description:
        "Create a video entry after thumbnail generation so selected thumbnail options can be organized.",
      inputSchema: z.object({
        title: z.string().describe("Internal video title"),
        description: z.string().optional().describe("Video description"),
        youtubeUrl: z.string().url().optional().describe("YouTube URL"),
        generationIds: z
          .array(z.string())
          .min(1)
          .max(3)
          .optional()
          .describe("Generation IDs to attach to this video"),
      }),
      execute: async ({ title, description, youtubeUrl, generationIds }) => {
        const video = await fetchAuthMutationForRequest(
          ctx.request,
          createVideoRef,
          {
            orgSlug: ctx.orgSlug,
            internalTitle: title,
            description,
            youtubeUrl,
            generationIds,
          },
        );

        return {
          success: true as const,
          videoId: video.id,
          title,
          slotsAssigned: generationIds?.length ?? 0,
        };
      },
    }),

    analyze_youtube_video: tool({
      description:
        "Watch a YouTube video and extract its content: summary, hook, transcript highlights, visual moments, and 3 thumbnail concepts. Use this whenever the user provides a YouTube link.",
      inputSchema: z.object({
        youtubeUrl: z.string().describe("The YouTube video URL"),
      }),
      execute: async ({ youtubeUrl }) => analyzeYoutubeVideo(youtubeUrl),
    }),
  };
}
