import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { prompt, images } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const fullPrompt = `${prompt.trim()}. Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors`;

    const imageContent = (images ?? []).map((img: string) => ({
      type: "image" as const,
      image: img,
    }));

    const result = await generateText({
      model: google("gemini-3-pro-image-preview"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: fullPrompt }, ...imageContent],
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

    if (generatedImages.length === 0) {
      return Response.json(
        { error: "No images were generated. Try a different prompt." },
        { status: 422 }
      );
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate images";
    return Response.json({ error: message }, { status: 500 });
  }
}
