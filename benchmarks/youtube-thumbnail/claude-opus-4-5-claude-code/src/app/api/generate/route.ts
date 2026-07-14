import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function POST(req: NextRequest) {
  try {
    const { faceImages, inspirationImage, extraImages, prompt, count } = await req.json();

    const imageParts: { type: "image"; image: string }[] = [];

    for (const img of faceImages) {
      imageParts.push({ type: "image", image: img });
    }

    if (inspirationImage) {
      imageParts.push({ type: "image", image: inspirationImage });
    }

    for (const img of extraImages) {
      imageParts.push({ type: "image", image: img });
    }

    const systemPrompt = buildPrompt(prompt, faceImages.length, !!inspirationImage, extraImages.length);

    const thumbnails: Array<{ id: string; base64: string; mimeType: string }> = [];

    const generateOne = async (): Promise<{ id: string; base64: string; mimeType: string } | null> => {
      const result = await generateText({
        model: google("gemini-3-pro-image-preview"),
        messages: [
          {
            role: "user",
            content: [...imageParts, { type: "text", text: systemPrompt }],
          },
        ],
        providerOptions: {
          google: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        },
      });

      if (!result.files || result.files.length === 0) {
        return null;
      }

      for (const file of result.files) {
        const mediaType = String(file.mediaType || "");
        if (mediaType.startsWith("image/")) {
          const id = crypto.randomUUID();
          let base64String = "";

          const base64Value = file.base64;
          if (typeof base64Value === "string") {
            base64String = base64Value;
          } else if ("base64Data" in file && typeof (file as any).base64Data === "string") {
            base64String = (file as any).base64Data;
          }

          return { id, base64: base64String, mimeType: mediaType };
        }
      }
      return null;
    };

    const promises = Array.from({ length: count }, () => generateOne());
    const results = await Promise.all(promises);

    for (const result of results) {
      if (result) thumbnails.push(result);
    }

    if (thumbnails.length === 0) {
      return NextResponse.json({ thumbnails: [], error: "No images were generated. Try again." });
    }

    return NextResponse.json({ thumbnails });
  } catch (error) {
    console.error("Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate thumbnails";
    return NextResponse.json({ thumbnails: [], error: errorMessage });
  }
}

function buildPrompt(
  userPrompt: string,
  faceCount: number,
  hasInspiration: boolean,
  extraCount: number
): string {
  const parts: string[] = [
    "Create a YouTube thumbnail in 16:9 ratio.",
    "Make it eye-catching, professional, and optimized for clicks.",
  ];

  if (faceCount > 0) {
    parts.push(
      `Use the ${
        faceCount === 1
          ? "provided face image"
          : `${faceCount} provided face images`
      } as reference for the person(s) in the thumbnail.`
    );
  }

  if (hasInspiration) {
    parts.push(
      "Use style, composition, and visual approach from inspiration image as a reference for overall look and feel."
    );
  }

  if (extraCount > 0) {
    parts.push(
      `Incorporate elements or context from ${extraCount} additional reference image(s) provided.`
    );
  }

  parts.push(`User instructions: ${userPrompt}`);

  return parts.join(" ");
}
