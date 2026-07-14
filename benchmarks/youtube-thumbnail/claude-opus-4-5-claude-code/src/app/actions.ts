"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

interface GenerateInput {
  faceImages: string[];
  inspirationImage?: string;
  extraImages: string[];
  prompt: string;
  count: number;
}

interface GeneratedThumbnail {
  id: string;
  base64: string;
  mimeType: string;
}

export async function generateThumbnails(
  input: GenerateInput
): Promise<{ thumbnails: GeneratedThumbnail[]; error?: string }> {
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", "application/json");

  try {
    const { faceImages, inspirationImage, extraImages, prompt, count } = input;

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

    const systemPrompt = buildPrompt(
      prompt,
      faceImages.length,
      !!inspirationImage,
      extraImages.length
    );

    const thumbnails: GeneratedThumbnail[] = [];

    const generateOne = async (): Promise<GeneratedThumbnail | null> => {
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

      for (let i = 0; i < result.files.length; i++) {
        const file = result.files[i];
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

          return {
            id,
            base64: base64String,
            mimeType: mediaType,
          };
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
      const errorResponse: { thumbnails: GeneratedThumbnail[]; error?: string } = {
        thumbnails: [],
        error: "No images were generated. Try again.",
      };
      return errorResponse;
    }

    const successResponse: { thumbnails: GeneratedThumbnail[] } = {
      thumbnails,
    };
    return successResponse;
  } catch (error) {
    console.error("Generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate thumbnails";
    const errorResponse: { thumbnails: GeneratedThumbnail[]; error?: string } = {
      thumbnails: [],
      error: errorMessage,
    };
    return errorResponse;
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
