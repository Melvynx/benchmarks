"use server";

import { google } from "@ai-sdk/google";
import { generateText } from "ai";

interface GenerateThumbnailsInput {
  faceImages: string[];
  inspirationImage: string | null;
  extraImages: string[];
  prompt: string;
  count: number;
}

function buildPrompt(
  faceImages: string[],
  inspirationImage: string | null,
  extraImages: string[],
  prompt: string,
  variationIndex: number,
): { systemPrompt: string; imageList: string[] } {
  const imageList: string[] = [];
  let imageIndex = 1;

  const facePositions: number[] = [];
  faceImages.forEach((img) => {
    facePositions.push(imageIndex++);
    imageList.push(img);
  });

  let inspirationPosition: number | null = null;
  if (inspirationImage) {
    inspirationPosition = imageIndex++;
    imageList.push(inspirationImage);
  }

  const extraPositions: number[] = [];
  extraImages.forEach((img) => {
    extraPositions.push(imageIndex++);
    imageList.push(img);
  });

  const variationHints = [
    "Use a dramatic, high-energy composition with bold contrasts.",
    "Create a clean, minimalist design with focus on the face expression.",
    "Use vibrant, saturated colors with dynamic lighting effects.",
    "Design with a cinematic feel, using shadows and depth.",
  ];

  let systemPrompt = `<role>
You are a world-class YouTube thumbnail designer who creates viral, click-worthy thumbnails that maximize CTR (click-through rate).
</role>

<task>
Generate ONE YouTube thumbnail image in exact 16:9 aspect ratio (1280x720 pixels standard).
${variationIndex > 0 ? `\nVARIATION HINT: ${variationHints[variationIndex % variationHints.length]}` : ""}
</task>

<image_inputs>
The following images are provided in order. Reference them by their position number:
`;

  if (facePositions.length > 0) {
    facePositions.forEach((pos, idx) => {
      systemPrompt += `
- Image ${pos} = FACE REFERENCE ${idx + 1}: Photo of a person's face.
  ACTION: Place this exact face prominently in the thumbnail. Preserve their likeness precisely. Make facial expression dramatic/exaggerated if appropriate for the topic.`;
    });
  }

  if (inspirationPosition) {
    systemPrompt += `
- Image ${inspirationPosition} = STYLE REFERENCE: An existing YouTube thumbnail to use as style inspiration.
  ACTION: Analyze this thumbnail's composition, color palette, text placement, and visual hierarchy. Apply the same style to your output. Do NOT copy its content or text - only its aesthetic approach.`;
  }

  if (extraPositions.length > 0) {
    extraPositions.forEach((pos, idx) => {
      systemPrompt += `
- Image ${pos} = EXTRA ELEMENT ${idx + 1}: Additional visual reference (product, object, background, etc.)
  ACTION: Incorporate recognizable elements from this image into the thumbnail composition.`;
    });
  }

  systemPrompt += `
</image_inputs>

<user_request>
${prompt}
</user_request>

<thumbnail_rules>
1. COMPOSITION: Use rule of thirds. Place the main subject (face) on left or right third, never dead center.
2. CONTRAST: Use high contrast between subject and background. Dark backgrounds with bright subjects or vice versa.
3. COLORS: Use 2-3 dominant colors maximum. Saturated, bold colors perform better.
4. FACES: If face references provided, make them LARGE (30-50% of frame). Show emotion - shock, excitement, curiosity.
5. SIMPLICITY: Maximum 3 focal elements. Cluttered thumbnails fail.
6. TEXT: If adding text, use max 3-4 words in bold, readable font. Place where it doesn't cover faces.
7. LIGHTING: Use dramatic lighting - rim lights, glows, or spotlight effects to make subjects pop.
</thumbnail_rules>

<output_specification>
- Format: Single image, 16:9 aspect ratio
- Style: Professional, high-production quality
- Goal: Make viewers NEED to click
</output_specification>

<quality_checklist>
Before finalizing, verify:
✓ Face likeness preserved from reference images
✓ Style matches inspiration thumbnail aesthetic
✓ 16:9 aspect ratio maintained
✓ High visual contrast and readability
✓ Clean composition with clear focal point
</quality_checklist>`;

  return { systemPrompt, imageList };
}

async function generateSingleThumbnail(
  faceImages: string[],
  inspirationImage: string | null,
  extraImages: string[],
  prompt: string,
  variationIndex: number,
): Promise<string | null> {
  const { systemPrompt, imageList } = buildPrompt(
    faceImages,
    inspirationImage,
    extraImages,
    prompt,
    variationIndex,
  );

  const messages: Array<{
    type: "text" | "image";
    text?: string;
    image?: string;
  }> = [];
  messages.push({ type: "text", text: systemPrompt });
  imageList.forEach((img) => {
    messages.push({ type: "image", image: img });
  });

  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    messages: [
      {
        role: "user",
        content: messages.map((m) =>
          m.type === "text"
            ? { type: "text" as const, text: m.text! }
            : { type: "image" as const, image: m.image! },
        ),
      },
    ],
  });

  const generatedImage = result.files?.find((f) =>
    f.mediaType.startsWith("image/"),
  );

  if (!generatedImage) {
    return null;
  }

  return `data:${generatedImage.mediaType};base64,${generatedImage.base64}`;
}

export async function generateThumbnails(
  input: GenerateThumbnailsInput,
): Promise<
  { success: true; images: string[] } | { success: false; error: string }
> {
  try {
    const { faceImages, inspirationImage, extraImages, prompt, count } = input;

    const promises = Array.from({ length: count }, (_, i) =>
      generateSingleThumbnail(
        faceImages,
        inspirationImage,
        extraImages,
        prompt,
        i,
      ),
    );

    const results = await Promise.all(promises);
    const images = results.filter((img): img is string => img !== null);

    if (images.length === 0) {
      return {
        success: false,
        error:
          "No images were generated. Please try again with a different prompt.",
      };
    }

    return { success: true, images };
  } catch (error) {
    console.error("Error generating thumbnails:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate thumbnails",
    };
  }
}
