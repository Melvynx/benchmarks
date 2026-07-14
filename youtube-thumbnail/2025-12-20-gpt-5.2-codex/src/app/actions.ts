"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function generateThumbnailAction(formData: {
  prompt: string;
  count: number;
  faceImages: string[];
  inspirationImage: string | null;
  extraImages: string[];
}) {
  try {
    const { prompt, count, faceImages, inspirationImage, extraImages } =
      formData;

    // Construct the comprehensive prompt
    let fullPrompt = `Create a YouTube thumbnail in 16:9 ratio. ${prompt}.`;

    if (faceImages.length > 0) {
      fullPrompt += ` Use the following face references for the main subject: [Face Images Attached].`;
    }

    if (inspirationImage) {
      fullPrompt += ` Match the visual style, lighting, and composition of this inspiration image: [Inspiration Image Attached].`;
    }

    if (extraImages.length > 0) {
      fullPrompt += ` Incorporate elements from these context images: [Extra Images Attached].`;
    }

    // Prepare files for the model
    const files: any[] = [];

    // Add face images
    faceImages.forEach((img, i) => {
      const base64Data = img.split(",")[1];
      files.push({
        data: base64Data,
        mimeType: img.split(";")[0].split(":")[1],
      });
    });

    // Add inspiration image
    if (inspirationImage) {
      const base64Data = inspirationImage.split(",")[1];
      files.push({
        data: base64Data,
        mimeType: inspirationImage.split(";")[0].split(":")[1],
      });
    }

    // Add extra images
    extraImages.forEach((img, i) => {
      const base64Data = img.split(",")[1];
      files.push({
        data: base64Data,
        mimeType: img.split(";")[0].split(":")[1],
      });
    });

    // Note: Gemini 3 Pro Image Preview might handle multiple images differently.
    // The AI SDK documentation for Google provider image output shows generateText.

    const results = [];

    // Since we want multiple generations, we might need to call it multiple times
    // or if the model supports it, do it in one go.
    // For "simultaneous generations" as per user requirement, we'll run them in parallel.

    const generationPromises = Array.from({ length: count }).map(() =>
      generateText({
        model: google("gemini-3-pro-image-preview"),
        prompt: fullPrompt,
        experimental_attachments: files.map((f) => ({
          url: `data:${f.mimeType};base64,${f.data}`,
          contentType: f.mimeType,
        })),
      })
    );

    const responses = await Promise.all(generationPromises);

    const generatedImages = responses
      .map((res, idx) => {
        console.log(`Response ${idx} finishReason:`, res.finishReason);

        // 1. Check res.files (Standard for image-producing models)
        // We use a safe check to avoid AI_NoOutputSpecifiedError
        const files = (res as any).files;
        if (files && files.length > 0) {
          const imageFile = files.find((f: any) =>
            f.contentType?.startsWith("image/")
          );
          if (imageFile) {
            console.log(
              `Response ${idx} found image in files:`,
              imageFile.contentType
            );
            let base64Data = "";
            if (typeof imageFile.data === "string") {
              base64Data = imageFile.data;
            } else if (
              imageFile.data instanceof Uint8Array ||
              Buffer.isBuffer(imageFile.data)
            ) {
              base64Data = Buffer.from(imageFile.data).toString("base64");
            }
            if (base64Data)
              return `data:${imageFile.contentType};base64,${base64Data}`;
          }
        }

        // 2. Check experimental_output safely
        const expOutput = (res as any).experimental_output;
        if (expOutput && expOutput.length > 0) {
          const img = expOutput.find(
            (f: any) =>
              f.type === "image" || f.contentType?.startsWith("image/")
          );
          if (img) {
            console.log(`Response ${idx} found image in experimental_output`);
            if (img.url) return img.url;

            let base64Data = "";
            if (typeof img.data === "string") {
              base64Data = img.data;
            } else if (
              img.data instanceof Uint8Array ||
              Buffer.isBuffer(img.data)
            ) {
              base64Data = Buffer.from(img.data).toString("base64");
            }
            if (base64Data)
              return `data:${
                img.contentType || "image/png"
              };base64,${base64Data}`;
          }
        }

        return null;
      })
      .filter(Boolean);

    return { success: true, images: generatedImages };
  } catch (error: any) {
    console.error("Generation Error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate thumbnail",
    };
  }
}
