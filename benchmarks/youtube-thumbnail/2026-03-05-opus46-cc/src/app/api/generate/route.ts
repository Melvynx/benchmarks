import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { prompt, extraImages, inspirationImage, personImages, count } =
      await req.json();

    const systemSuffix =
      "Create a YouTube thumbnail in 16:9 ratio (1280x720), photorealistic, high quality, vibrant colors, eye-catching, designed for maximum click-through rate.";

    const imageEntries: { type: "image"; image: string }[] = [];

    if (inspirationImage) {
      imageEntries.push({ type: "image", image: inspirationImage });
    }

    if (extraImages?.length) {
      for (const img of extraImages) {
        imageEntries.push({ type: "image", image: img });
      }
    }

    if (personImages?.length) {
      for (const img of personImages) {
        imageEntries.push({ type: "image", image: img });
      }
    }

    let personInstruction = "";
    if (personImages?.length) {
      personInstruction = ` The person(s) in the uploaded photos should appear in the thumbnail. Keep their likeness accurate.`;
    }

    let inspirationInstruction = "";
    if (inspirationImage) {
      inspirationInstruction = ` Use the first uploaded image as style inspiration for the thumbnail layout and mood.`;
    }

    let extraInstruction = "";
    if (extraImages?.length) {
      extraInstruction = ` Incorporate the extra uploaded images as visual elements in the thumbnail.`;
    }

    const fullPrompt = `${prompt}${personInstruction}${inspirationInstruction}${extraInstruction} ${systemSuffix}`;

    const generatedImages: { data: string; mediaType: string }[] = [];

    const iterations = Math.min(count || 1, 4);

    for (let i = 0; i < iterations; i++) {
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
              ...imageEntries,
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
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate thumbnail";
    return Response.json({ error: message }, { status: 500 });
  }
}
