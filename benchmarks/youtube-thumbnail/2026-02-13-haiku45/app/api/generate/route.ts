import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: Request) {
  try {
    const { prompt, images, count } = await req.json();

    if (!prompt || !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "Missing prompt or API key" },
        { status: 400 }
      );
    }

    const enhancedPrompt = `${prompt}\n\nCreate a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors. Generate ${count} different variations with different styles and compositions.`;

    const messages: any[] = [
      {
        role: "user",
        content: [
          { type: "text" as const, text: enhancedPrompt },
          ...(images || []).map((img: string) => ({
            type: "image" as const,
            image: img,
          })),
        ],
      },
    ];

    const result = await generateText({
      model: google("gemini-3-pro-image-preview"),
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
      messages,
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

    return Response.json({
      success: true,
      images: generatedImages,
      message: result.text,
    });
  } catch (error) {
    console.error("Generation error:", error);
    return Response.json(
      { error: "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}
