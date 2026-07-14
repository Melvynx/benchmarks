import { IMAGE_MODELS } from "../../lib/ai/image-models";
import { isContentPolicyError } from "../../lib/ai/gemini";
import { uploadBufferToS3 } from "../../lib/aws/aws-s3-upload-files";
import { ActionError } from "../../lib/errors/action-error";
import { logger } from "../../lib/logger";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export async function anonymizeImage(
  imageUrl: string,
  options?: {
    customApiKey?: string;
    prefix?: string;
    subject?: boolean;
    text?: boolean;
    logos?: boolean;
  },
): Promise<string> {
  const prefix = options?.prefix ?? "inspirations";
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to fetch image for anonymization");
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  const google = createGoogleGenerativeAI({
    apiKey: options?.customApiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  logger.info(`[Anonymize] Starting anonymization with Gemini`);

  const anonymizeSubject = options?.subject ?? true;
  const anonymizeText = options?.text ?? false;
  const anonymizeLogos = options?.logos ?? false;
  const editInstructions = [
    anonymizeSubject
      ? "Replace every human person with a dark grey 3D clay wireframe mannequin with a completely blank neutral head. The mannequin must have no eyes, no nose, no mouth, no lips, no teeth, no smile, no facial expression, no hair, no clothing, and a subtle dashed grid texture. Keep each mannequin in the exact same position, size, silhouette, and pose as the original person."
      : null,
    anonymizeText
      ? "Replace every readable word, title, caption, label, and number with readable lorem placeholder text. Use a different numbered placeholder for each separate text block, ordered left-to-right and top-to-bottom: examples are LOREM 1, IPSUM 2, DOLOR 3, SIT AMET 4. Do not keep any original words or numbers. Preserve each original text block's colors, weight, size, spacing, perspective, glow, shadows, and typography style."
      : null,
    anonymizeLogos
      ? "Replace every recognizable brand, app, product, company, or tool logo with a flat matte dark grey square or rounded-square placeholder. Keep the placeholder simple and graphic, with minimal texture and no 3D pillow effect. Add a centered readable light number on each placeholder, ordered left-to-right and top-to-bottom: 1, 2, 3, and so on. Fit each numbered placeholder to the original logo position and size."
      : null,
  ].filter(Boolean);
  const protectedElements = [
    "same background",
    "same colors",
    anonymizeSubject ? null : "same people",
    anonymizeSubject ? null : "same faces",
    anonymizeSubject ? null : "same pose",
    anonymizeSubject ? null : "same clothing",
    anonymizeSubject ? null : "same body position",
    anonymizeText ? null : "same text",
    anonymizeLogos ? null : "same logos",
    "same objects",
    "same lighting",
  ].filter(Boolean);

  let result;
  try {
    result = await generateText({
      model: google(IMAGE_MODELS["gemini-3.1-flash"].apiModelId),
      providerOptions: {
        google: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: imageBuffer },
            {
              type: "text",
              text: `Edit this image.

${editInstructions.join("\n\n")}

Do NOT change anything else - ${protectedElements.join(", ")}. Output 1280x720px.`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    logger.error(`[Anonymize] Gemini generation failed`, error);
    if (isContentPolicyError(error)) {
      throw new ActionError(
        "This image was blocked by AI content policy and cannot be anonymized. Please try a different image.",
      );
    }
    throw new ActionError(
      "Failed to anonymize image. The AI service returned an error. Please try again.",
    );
  }

  const imageFile = result.files.find((file) =>
    file.mediaType.startsWith("image/"),
  );

  if (!imageFile) {
    logger.error(`[Anonymize] No image in Gemini response`, {
      filesCount: result.files.length,
      textPreview: result.text.substring(0, 200),
    });
    throw new ActionError(
      "Failed to anonymize image - AI did not return an image. Please try again.",
    );
  }

  const url = await uploadBufferToS3({
    buffer: Buffer.from(imageFile.uint8Array),
    prefix,
    fileName: `anonymized-${Date.now()}`,
    contentType: imageFile.mediaType,
  });

  if (!url) {
    throw new Error("Failed to upload anonymized image");
  }

  logger.info(`[Anonymize] Successfully anonymized and uploaded: ${url}`);
  return url;
}
