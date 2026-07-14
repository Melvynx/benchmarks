"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

interface GenerateThumbnailInput {
  faceImages: string[];
  inspirationImage: string | null;
  extraImages: string[];
  prompt: string;
}

interface GenerateThumbnailResult {
  success: boolean;
  image?: string;
  error?: string;
}

export async function generateThumbnail(
  input: GenerateThumbnailInput
): Promise<GenerateThumbnailResult> {
  try {
    const { faceImages, inspirationImage, extraImages, prompt } = input;

    // Build the message content
    const content: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string; mediaType?: string }
    > = [];

    // Build a comprehensive prompt
    let textPrompt = `Create a professional YouTube thumbnail in 16:9 aspect ratio (1280x720 pixels).

User's Instructions: ${prompt || "Create an engaging, eye-catching thumbnail"}

Guidelines:
- Make it visually striking and attention-grabbing
- Use bold, readable text if text is needed
- Create high contrast and vivid colors
- Ensure faces are prominent and expressive
- Professional quality suitable for YouTube`;

    if (faceImages.length > 0) {
      textPrompt += `\n\nIMPORTANT: Use the provided face image(s) as the main subject. The face should be prominent, expressive, and positioned to draw attention.`;
    }

    if (inspirationImage) {
      textPrompt += `\n\nStyle Reference: Match the visual style, composition, and energy of the provided inspiration thumbnail.`;
    }

    if (extraImages.length > 0) {
      textPrompt += `\n\nIncorporate elements or style from the additional reference images provided.`;
    }

    content.push({ type: "text", text: textPrompt });

    // Add face images
    for (const img of faceImages) {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
      content.push({
        type: "image",
        image: base64Data,
      });
    }

    // Add inspiration image
    if (inspirationImage) {
      const base64Data = inspirationImage.replace(/^data:image\/\w+;base64,/, "");
      content.push({
        type: "image",
        image: base64Data,
      });
    }

    // Add extra images
    for (const img of extraImages) {
      const base64Data = img.replace(/^data:image\/\w+;base64,/, "");
      content.push({
        type: "image",
        image: base64Data,
      });
    }

    const result = await generateText({
      model: google("gemini-3-pro-image-preview", {
        useSearchGrounding: false,
      }),
      providerOptions: {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      },
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // Extract image from result.files
    if (result.files && result.files.length > 0) {
      for (const file of result.files) {
        if (file.mediaType.startsWith("image/")) {
          // Convert Uint8Array to base64
          const base64 = Buffer.from(file.uint8Array).toString("base64");
          const dataUrl = `data:${file.mediaType};base64,${base64}`;
          return { success: true, image: dataUrl };
        }
      }
    }

    return {
      success: false,
      error: "No image was generated. Please try again with different inputs.",
    };
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while generating the thumbnail.",
    };
  }
}

