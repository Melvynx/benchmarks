import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, images, count = 1 } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const enhancedPrompt = `${prompt}. Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors`;

    const imageContent = (images || []).map((img: string) => ({
      type: "image" as const,
      image: img,
    }));

    const allImages = [];

    for (let i = 0; i < count; i++) {
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
              ...imageContent,
            ],
          },
        ],
      });

      for (const file of result.files ?? []) {
        if (file.mediaType.startsWith("image/")) {
          allImages.push({
            data: file.base64,
            mediaType: file.mediaType,
          });
        }
      }
    }

    return Response.json({ images: allImages });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}
