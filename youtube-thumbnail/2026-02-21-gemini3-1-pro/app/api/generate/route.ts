import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export async function POST(req: Request) {
  try {
    const { prompt, images, count } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const enhancedPrompt = `${prompt}\nCreate a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors`;

    // Extract base64 part only
    const cleanImages = (images || []).map((img: string) => {
      const base64Parts = img.split(',');
      return {
        type: 'image' as const,
        image: base64Parts.length > 1 ? base64Parts[1] : img
      };
    });

    const results = [];
    const numToGenerate = Math.min(Math.max(1, count || 1), 4);

    // We can't generate multiple images with one call easily as it's not well supported right now by
    // AI SDK generateText images output so we run it multiple times if count > 1
    for (let i = 0; i < numToGenerate; i++) {
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
              ...cleanImages,
            ],
          },
        ],
      });

      // Extract generated images
      let generatedImage = null;
      for (const file of result.files ?? []) {
        if (file.mediaType.startsWith("image/")) {
          // Add data URI prefix to the base64 string
          generatedImage = `data:${file.mediaType};base64,${file.base64}`;
          break; // only taking one image per call
        }
      }

      if (generatedImage) {
        results.push(generatedImage);
      }
    }

    return Response.json({ images: results });
  } catch (error) {
    console.error("Error generating image:", error);
    return Response.json(
      { error: "Failed to generate thumbnail. Please try again." },
      { status: 500 }
    );
  }
}