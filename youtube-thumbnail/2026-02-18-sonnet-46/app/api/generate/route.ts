import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const THUMBNAIL_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";

export async function POST(req: Request) {
  const { prompt, images } = await req.json();

  const fullPrompt = `${prompt}. ${THUMBNAIL_SUFFIX}`;

  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
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

  return Response.json({ images: generatedImages });
}
