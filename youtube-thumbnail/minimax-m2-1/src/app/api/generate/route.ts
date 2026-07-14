import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { prompt, images } = await req.json();

    const enhancedPrompt = `${prompt} Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors`;

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
            ...(images?.map((img: string) => ({
              type: "image" as const,
              image: img,
            })) || []),
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

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
