import { logger } from "../logger";
import { upfetch } from "../up-fetch";
import { z } from "zod";

export type CloudflareWatermarkParams = {
  sourceUrl: string;
  outputKey: string;
  contentType: string;
  width?: number;
  height?: number;
};

const WATERMARK_WIDTH_RATIO = 0.72;
const WATERMARK_HEIGHT_RATIO = 0.18;
const PADDING_RATIO = 0.025;
const CloudflareWatermarkResponseSchema = z.object({
  url: z.string().url(),
});

function getImageFormat(contentType: string) {
  const [, format = "png"] = contentType.split("/");
  return format === "jpg" ? "jpeg" : format;
}

function getWatermarkLayout(width?: number, height?: number) {
  if (!width || !height) return undefined;

  const padding = Math.round(Math.min(width, height) * PADDING_RATIO);

  return {
    left: padding,
    bottom: padding,
    width: Math.max(1, Math.round(width * WATERMARK_WIDTH_RATIO)),
    height: Math.max(1, Math.round(height * WATERMARK_HEIGHT_RATIO)),
  };
}

export async function createCloudflareWatermarkedImage(
  params: CloudflareWatermarkParams,
): Promise<string | null> {
  const workerUrl = process.env.CLOUDFLARE_WATERMARK_WORKER_URL;
  if (!workerUrl) {
    throw new Error("CLOUDFLARE_WATERMARK_WORKER_URL is not configured");
  }

  try {
    const payload = await upfetch(workerUrl, {
      method: "POST",
      headers: {
        ...(process.env.CLOUDFLARE_WATERMARK_SECRET
          ? {
              authorization: `Bearer ${process.env.CLOUDFLARE_WATERMARK_SECRET}`,
            }
          : {}),
      },
      body: {
        sourceUrl: params.sourceUrl,
        outputKey: params.outputKey,
        format: getImageFormat(params.contentType),
        layout: getWatermarkLayout(params.width, params.height),
      },
      schema: CloudflareWatermarkResponseSchema,
    });

    return payload.url;
  } catch (error) {
    logger.error("[Watermark] Failed to request Cloudflare watermark", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
