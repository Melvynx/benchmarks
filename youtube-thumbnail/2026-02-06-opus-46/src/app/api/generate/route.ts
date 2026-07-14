import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { prompt, images, count } = await req.json();

    const fullPrompt = `${prompt}\n\nCreate a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors. Generate ${count ?? 1} thumbnail variation(s).`;

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string }
    > = [{ type: "text", text: fullPrompt }];

    if (images && Array.isArray(images)) {
      for (const img of images) {
        userContent.push({ type: "image", image: img });
      }
    }

    const result = await generateText({
      model: google("gemini-3-pro-image-preview"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const generatedImages: Array<{ data: string; mediaType: string }> = [];
    for (const file of result.files ?? []) {
      if (file.mediaType.startsWith("image/")) {
        generatedImages.push({
          data: file.base64,
          mediaType: file.mediaType,
        });
      }
    }

    return Response.json({ images: generatedImages, text: result.text });
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate thumbnails";
    return Response.json({ error: message }, { status: 500 });
  }
}
