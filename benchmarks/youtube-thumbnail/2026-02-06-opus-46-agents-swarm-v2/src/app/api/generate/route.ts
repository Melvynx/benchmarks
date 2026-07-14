import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, images, count } = (await request.json()) as {
      prompt: string;
      images: string[];
      count: number;
    };

    const fullPrompt = `${prompt}. Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors`;

    const content: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string }
    > = [{ type: "text", text: fullPrompt }];

    for (const imgBase64 of images) {
      content.push({ type: "image", image: imgBase64 });
    }

    const generateOne = () =>
      generateText({
        model: google("gemini-3-pro-image-preview"),
        messages: [{ role: "user", content }],
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
      });

    const results = await Promise.all(
      Array.from({ length: count }, () => generateOne())
    );

    const allImages = results.flatMap((result) =>
      (result.files ?? [])
        .filter((file) => file.mediaType.startsWith("image/"))
        .map((file) => ({
          data: file.base64,
          mediaType: file.mediaType,
        }))
    );

    return NextResponse.json({ images: allImages });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnails" },
      { status: 500 }
    );
  }
}
