import { google } from "@ai-sdk/google";
import { generateText } from "ai";

import { THUMBNAIL_SUFFIX } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

type GenerateBody = {
  prompt?: string;
  images?: string[];
  count?: number;
};

type GeneratedImage = {
  data: string;
  mediaType: string;
};

function clampCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(4, Math.max(1, Math.round(parsed)));
}

async function generateOne(
  prompt: string,
  images: string[],
): Promise<GeneratedImage[]> {
  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    providerOptions: {
      google: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "16:9" },
      },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...images.map((img: string) => ({
            type: "image" as const,
            image: img,
          })),
        ],
      },
    ],
  });

  const generatedImages: GeneratedImage[] = [];
  for (const file of result.files ?? []) {
    if (file.mediaType.startsWith("image/")) {
      generatedImages.push({
        data: file.base64,
        mediaType: file.mediaType,
      });
    }
  }
  return generatedImages;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateBody;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const count = clampCount(body.count);
    const fullPrompt = `${prompt}\n\n${THUMBNAIL_SUFFIX}`;

    const batches = await Promise.all(
      Array.from({ length: count }, () => generateOne(fullPrompt, images)),
    );
    const generatedImages = batches.flat();

    if (generatedImages.length === 0) {
      return Response.json(
        { error: "The model returned no images." },
        { status: 502 },
      );
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
