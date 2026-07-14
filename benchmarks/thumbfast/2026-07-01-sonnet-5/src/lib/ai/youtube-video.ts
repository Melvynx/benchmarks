import { logger } from "../logger";
import {
  extractVideoId,
  fetchYoutubeOembed,
} from "@/features/inspiration/youtube-utils";
import { generateObject } from "ai";
import { z } from "zod";
import { getAnalysisModel } from "./gemini";

const VIDEO_ID_PATTERN = /^[\w-]{11}$/;

const VideoAnalysisSchema = z.object({
  summary: z
    .string()
    .describe(
      "Concise summary of what the video is about and its main promise to the viewer (2-4 sentences)",
    ),
  hook: z
    .string()
    .describe(
      "The single most click-worthy angle or emotional hook of the video, in one sentence",
    ),
  keyTopics: z
    .array(z.string())
    .max(8)
    .describe(
      "Main topics, brands, tools, products, or people mentioned in the video",
    ),
  transcriptHighlights: z
    .array(z.string())
    .max(10)
    .describe(
      "The most important spoken lines or claims from the video, paraphrased or quoted",
    ),
  visualMoments: z
    .array(z.string())
    .max(6)
    .describe(
      "Visually striking moments in the video that could inspire a thumbnail (scenes, objects, expressions)",
    ),
  thumbnailConcepts: z
    .array(
      z.object({
        concept: z
          .string()
          .describe(
            "Short thumbnail concept: pose/expression, one key element, simple background",
          ),
        reasoning: z.string().describe("Why this concept fits the video"),
      }),
    )
    .min(3)
    .max(3)
    .describe("Exactly 3 distinct thumbnail concepts for this video"),
  overlayTextIdeas: z
    .array(z.string())
    .max(5)
    .describe(
      "Short punchy text overlay ideas for the thumbnail (1-4 words each)",
    ),
});

export type VideoAnalysis = z.infer<typeof VideoAnalysisSchema>;

export type YoutubeVideoAnalysisResult = {
  videoId: string | null;
  title: string | null;
  author: string | null;
  analysis: VideoAnalysis | null;
  error: string | null;
};

async function analyzeVideoContent(
  watchUrl: string,
  metadata: { title: string | null; author: string | null },
): Promise<VideoAnalysis> {
  const context = [
    metadata.title ? `Video title: "${metadata.title}"` : null,
    metadata.author ? `Channel: ${metadata.author}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Gemini fetches the video through Google's infrastructure when the YouTube
  // URL is passed as a file part - no transcript scraping or proxies needed.
  const result = await generateObject({
    model: getAnalysisModel(),
    schema: VideoAnalysisSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: new URL(watchUrl),
            mediaType: "video/mp4",
          },
          {
            type: "text",
            text: `Watch this YouTube video and analyze it for thumbnail creation.
${context}

Extract the content faithfully: what is said, what is shown, and what makes it click-worthy. The thumbnail concepts must follow this formula: [person expression/pose], [one key visual element], [simple background]. Keep concepts simple - 2-3 visual elements max, no clutter.`,
          },
        ],
      },
    ],
  });

  return result.object;
}

export async function analyzeYoutubeVideo(
  youtubeUrl: string,
): Promise<YoutubeVideoAnalysisResult> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) {
    return {
      videoId: null,
      title: null,
      author: null,
      analysis: null,
      error: "Invalid YouTube URL",
    };
  }

  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const metadata = await fetchYoutubeOembed(watchUrl);

  try {
    const analysis = await analyzeVideoContent(watchUrl, metadata);
    return {
      videoId,
      title: metadata.title,
      author: metadata.author,
      analysis,
      error: null,
    };
  } catch (error) {
    logger.error("[youtube-video] video analysis failed", {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    });
    const isUnavailable = !metadata.title && !metadata.author;
    return {
      videoId,
      title: metadata.title,
      author: metadata.author,
      analysis: null,
      error: isUnavailable
        ? "This video is unavailable or private. Tell the user you cannot analyze it and ask for a public video."
        : "Video content analysis failed. Use the title and channel metadata instead.",
    };
  }
}
