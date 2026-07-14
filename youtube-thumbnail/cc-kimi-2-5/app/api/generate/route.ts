import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, images, count = 1 } = await req.json();

    if (!prompt) {
      return Response.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const enhancedPrompt = `${prompt}\n\nCreate a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors. This is ${count > 1 ? `variant ${count} of ${count} thumbnails` : "the main thumbnail"}.`;

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

    const generatedImages = [];
    for (const file of result.files ?? []) {
      if (file.mediaType.startsWith("image/")) {
        generatedImages.push({
          data: file.base64,
          mediaType: file.mediaType,
        });
      }
    }

    if (generatedImages.length === 0) {
      return Response.json(
        { error: "No images were generated. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: "Failed to generate images. Please try again." },
      { status: 500 }
    );
  }
}
