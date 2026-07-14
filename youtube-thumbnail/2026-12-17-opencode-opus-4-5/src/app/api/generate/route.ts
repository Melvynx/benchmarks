import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, images, count = 1 } = await req.json();

    const enhancedPrompt = `${prompt}

Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors. The thumbnail should be eye-catching and designed to maximize click-through rate.`;

    const generatedImages: { data: string; mediaType: string }[] = [];

    const generateOne = async () => {
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

      for (const file of result.files ?? []) {
        if (file.mediaType.startsWith("image/")) {
          generatedImages.push({
            data: file.base64,
            mediaType: file.mediaType,
          });
        }
      }
    };

    const promises = Array.from({ length: count }, () => generateOne());
    await Promise.all(promises);

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
