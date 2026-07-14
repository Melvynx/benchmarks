import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { prompt, images } = await req.json();

    // Append the required prompt suffix
    const enhancedPrompt = `${prompt}. Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors`;

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

    // Extract generated images
    const generatedImages = [];
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
    return Response.json(
      { error: "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}
