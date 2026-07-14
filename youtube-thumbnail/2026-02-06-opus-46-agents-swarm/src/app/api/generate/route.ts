import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { prompt, extraImages, inspirationImage, personImages, count } = await req.json();

  const systemSuffix = "Create a YouTube thumbnail in 16:9 ratio (1280x720), photorealistic, high quality, vibrant colors, eye-catching, designed for maximum click-through rate.";
  const fullPrompt = `${prompt}\n\n${systemSuffix}`;

  const imageContent: Array<{ type: "image"; image: string }> = [];

  if (inspirationImage) {
    imageContent.push({ type: "image" as const, image: inspirationImage });
  }
  if (extraImages && extraImages.length > 0) {
    for (const img of extraImages) {
      imageContent.push({ type: "image" as const, image: img });
    }
  }
  if (personImages && personImages.length > 0) {
    for (const img of personImages) {
      imageContent.push({ type: "image" as const, image: img });
    }
  }

  const actualCount = Math.min(Math.max(count || 1, 1), 4);

  const promises = Array.from({ length: actualCount }, () =>
    generateText({
      model: google("gemini-3-pro-image-preview"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: fullPrompt },
            ...imageContent,
          ],
        },
      ],
    })
  );

  const results = await Promise.allSettled(promises);

  const generatedImages: Array<{ data: string; mediaType: string }> = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const file of result.value.files ?? []) {
        if (file.mediaType.startsWith("image/")) {
          generatedImages.push({
            data: file.base64,
            mediaType: file.mediaType,
          });
        }
      }
    }
  }

  if (generatedImages.length === 0) {
    return Response.json(
      { error: "Failed to generate thumbnails. Please try again." },
      { status: 500 }
    );
  }

  return Response.json({ images: generatedImages });
}
