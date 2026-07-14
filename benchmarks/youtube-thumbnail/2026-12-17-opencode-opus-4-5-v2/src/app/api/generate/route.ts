import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, images, count = 1 } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const enhancedPrompt = `${prompt}. Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors. Generate ${count} variation(s).`;

    const content: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text", text: enhancedPrompt },
    ];

    if (images && images.length > 0) {
      for (const img of images) {
        content.push({ type: "image", image: img });
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
          content,
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

    if (generatedImages.length === 0) {
      return Response.json(
        { error: "No images were generated. Please try again with a different prompt." },
        { status: 500 }
      );
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}
