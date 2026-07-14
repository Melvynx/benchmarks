import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { prompt, images, count } = await req.json();

    const enhancedPrompt = `${prompt}\n\nCreate a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors. Generate exactly ${count ?? 1} thumbnail variation(s).`;

    const result = await generateText({
      model: google("gemini-3-pro-image-preview"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: enhancedPrompt },
            ...images.map((img: string) => ({
              type: "image" as const,
              image: img,
            })),
          ],
        },
      ],
    });

    const generatedImages: { data: string; mediaType: string }[] = [];
    for (const file of result.files ?? []) {
      if (file.mediaType.startsWith("image/")) {
        generatedImages.push({
          data: file.base64,
          mediaType: file.mediaType,
        });
      }
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate thumbnails";
    return Response.json({ error: message }, { status: 500 });
  }
}
