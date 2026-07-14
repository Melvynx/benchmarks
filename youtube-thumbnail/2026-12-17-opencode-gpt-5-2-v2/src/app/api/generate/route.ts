import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { prompt, images } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const result = await generateText({
      model: google("gemini-3-pro-image-preview"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...((images ?? []) as string[]).map((img) => ({
              type: "image" as const,
              image: img,
            })),
          ],
        },
      ],
    });

    const generatedImages = [] as { data: string; mediaType: string }[];
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
    return Response.json(
      { error: "Failed to generate images." },
      { status: 500 }
    );
  }
}
