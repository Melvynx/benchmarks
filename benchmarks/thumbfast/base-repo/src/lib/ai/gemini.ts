import { logger } from "../logger";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { RUNTIME_TEXT_MODEL } from "./text-models";

export const getAnalysisModel = (customApiKey?: string) => {
  if (customApiKey) {
    const customGoogle = createGoogleGenerativeAI({ apiKey: customApiKey });
    return customGoogle(RUNTIME_TEXT_MODEL);
  }
  return google(RUNTIME_TEXT_MODEL);
};

export const THUMBNAIL_CATEGORIES = [
  "Tutorial",
  "Vlog",
  "Gaming",
  "Review",
  "Entertainment",
  "News",
  "Music",
  "Education",
  "Lifestyle",
  "Other",
] as const;

export type ThumbnailCategory = (typeof THUMBNAIL_CATEGORIES)[number];

const getEnhanceModel = (customApiKey?: string) => {
  if (customApiKey) {
    const customGoogle = createGoogleGenerativeAI({ apiKey: customApiKey });
    return customGoogle(RUNTIME_TEXT_MODEL);
  }
  return google(RUNTIME_TEXT_MODEL);
};

export async function enhancePrompt(
  prompt: string,
  customApiKey?: string,
): Promise<string> {
  const result = await generateText({
    model: getEnhanceModel(customApiKey),
    messages: [
      {
        role: "user",
        content: `Rewrite this prompt to make it clearer. Do NOT add new ideas or details. Just:
- Fix grammar and spelling
- Remove vague words (try, maybe, generally)
- Reorder for logical flow
- Make it direct and specific
- KEEP all @mentions exactly as they are (e.g. @Melvyn, @Office Workspace). Do NOT remove, rename, or modify them.

Output ONLY the rewritten prompt, nothing else.

${prompt}`,
      },
    ],
  });

  return result.text.trim();
}

export type DescribeImageParams = {
  imageUrl: string;
  customApiKey?: string;
};

const InspirationAnalysisSchema = z.object({
  name: z
    .string()
    .describe(
      "A short, punchy, attention-grabbing title for this thumbnail (2-5 words). Think YouTube clickbait energy — dramatic, curiosity-inducing, emotional. Examples: 'I Broke Everything', 'The Final Betrayal', 'Nobody Expected This', 'She Said YES', 'Gone In 24 Hours', 'The Untold Truth'",
    ),
  description: z
    .string()
    .describe(
      "Detailed style description with keywords: color palette, lighting style, subject pose/expression, background type, overall mood",
    ),
  category: z
    .enum(THUMBNAIL_CATEGORIES)
    .describe(
      "The category that best describes this thumbnail content type: Tutorial, Vlog, Gaming, Review, Entertainment, News, Music, Education, Lifestyle, or Other",
    ),
});

export type InspirationAnalysis = z.infer<typeof InspirationAnalysisSchema>;

export type GeneratePromptNameParams = {
  textPrompt: string;
  personDescriptions?: string[];
  inspirationDescription?: string;
  customApiKey?: string;
};

export async function generatePromptName(
  params: GeneratePromptNameParams,
): Promise<string> {
  const {
    textPrompt,
    personDescriptions = [],
    inspirationDescription,
    customApiKey,
  } = params;

  let context = `Text prompt: ${textPrompt}`;
  if (personDescriptions.length > 0) {
    context += `\nPersons: ${personDescriptions.join(", ")}`;
  }
  if (inspirationDescription) {
    context += `\nInspiration style: ${inspirationDescription}`;
  }

  const result = await generateText({
    model: getAnalysisModel(customApiKey),
    messages: [
      {
        role: "user",
        content: `Generate a short, creative name (2-5 words) for this YouTube thumbnail project based on the context below. The name should capture the essence or theme of the thumbnail. Output ONLY the name, nothing else.

${context}`,
      },
    ],
  });

  return result.text.trim();
}

const UserImageAnalysisSchema = z.object({
  name: z
    .string()
    .describe(
      "2-3 keyword name identifying what's in the image. Use nouns only, no adjectives like 'smiling' or filler words like 'with'. Examples: 'Man Mustache', 'Red Trophy', 'City Skyline', 'Forest Path', 'Blue Car'",
    ),
  description: z
    .string()
    .describe(
      "4-9 word description with colors, objects, and style. Examples: 'Red gradient background with fire flames', 'Golden trophy on wooden desk'",
    ),
});

export type UserImageAnalysis = z.infer<typeof UserImageAnalysisSchema>;

export async function analyzeUploadedImage(
  imageUrl: string,
  customApiKey?: string,
): Promise<UserImageAnalysis> {
  logger.info(`[Image Analysis] Analyzing image: ${imageUrl}`);

  try {
    const result = await generateObject({
      model: getAnalysisModel(customApiKey),
      schema: UserImageAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageUrl,
            },
            {
              type: "text",
              text: `Analyze this image and provide:
1. A short 2-3 keyword NAME (nouns only, no adjectives or filler words)
2. A 4-9 word DESCRIPTION with colors, objects, and style

Name examples: "Man Mustache", "Red Trophy", "City Skyline", "Forest Path"
Description examples: "Red gradient with fire flames", "Golden trophy on wooden desk"`,
            },
          ],
        },
      ],
    });

    logger.info(
      `[Image Analysis] Generated: name="${result.object.name}", description="${result.object.description}"`,
    );
    return result.object;
  } catch (error) {
    logger.error(`[Image Analysis] Failed to analyze image`, error);
    throw error;
  }
}

const PersonImageQualitySchema = z.object({
  isPerson: z
    .boolean()
    .describe(
      "true only if a single real human face is clearly visible. false for objects, animals, logos, text, landscapes, or if no face is visible.",
    ),
  facingCamera: z
    .boolean()
    .describe(
      "true if the person looks toward the camera and the full face is visible. false if the head is turned fully to the left or right (profile), looking away, or the face is partially hidden.",
    ),
  facingCameraFeedback: z
    .string()
    .describe(
      "Short sentence (max 12 words) about face orientation; if failing, say how to fix it.",
    ),
  wellFramed: z
    .boolean()
    .describe(
      "true if the face is centered, fully inside the frame (not cropped at the edges), and large enough to see clearly. false if cropped, too far away, or off-center.",
    ),
  wellFramedFeedback: z
    .string()
    .describe(
      "Short sentence (max 12 words) about framing; if failing, say how to fix it.",
    ),
  evenLighting: z
    .boolean()
    .describe(
      "true if lighting is even and monotone. false if there are strong colored or studio lights, harsh shadows, mixed/variable light sources, or the photo is overexposed / too bright.",
    ),
  evenLightingFeedback: z
    .string()
    .describe(
      "Short sentence (max 12 words) about lighting; if failing, say how to fix it.",
    ),
  naturalExpression: z
    .boolean()
    .describe(
      "true if the expression is neutral or a slight smile. false for exaggerated expressions (big open-mouth smile, laughing, shouting, extreme faces).",
    ),
  naturalExpressionFeedback: z
    .string()
    .describe(
      "Short sentence (max 12 words) about the expression; if failing, say how to fix it.",
    ),
});

export type PersonImageQuality = z.infer<typeof PersonImageQualitySchema>;

/**
 * Analyzes a person reference photo for thumbnail-generation quality:
 * is the face front-facing and fully visible, well framed, evenly lit, and
 * with a neutral / slight-smile expression. Returns per-criterion feedback.
 */
export async function analyzePersonImageQuality(
  imageUrl: string,
  customApiKey?: string,
): Promise<PersonImageQuality> {
  logger.info(`[Person Quality] Analyzing person image: ${imageUrl}`);

  try {
    const result = await generateObject({
      model: getAnalysisModel(customApiKey),
      schema: PersonImageQualitySchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageUrl,
            },
            {
              type: "text",
              text: `You are reviewing a reference photo that will be used to generate AI YouTube thumbnails of this person. A clean, front-facing, evenly-lit, neutral reference works best because the image model needs to reproduce the face reliably. Studio setups with variable or colored lights confuse the AI.

Evaluate the photo against each criterion and return your assessment. Be strict but fair. For every criterion except isPerson, write a short feedback sentence (max 12 words); when a criterion fails, the feedback must say how to fix it.`,
            },
          ],
        },
      ],
    });

    logger.info(
      `[Person Quality] isPerson=${result.object.isPerson} facingCamera=${result.object.facingCamera} wellFramed=${result.object.wellFramed} evenLighting=${result.object.evenLighting} naturalExpression=${result.object.naturalExpression}`,
    );
    return result.object;
  } catch (error) {
    logger.error(`[Person Quality] Failed to analyze person image`, error);
    throw error;
  }
}

export async function describeUploadedImage(
  imageUrl: string,
  customApiKey?: string,
): Promise<string> {
  const analysis = await analyzeUploadedImage(imageUrl, customApiKey);
  return analysis.description;
}

const NOT_PERSON_MARKER = "NOT_PERSON";

const PersonDescriptionSchema = z.object({
  description: z
    .string()
    .min(3)
    .describe(
      `Either a short description of the person (hair color, glasses, facial hair, hat) OR the exact text "${NOT_PERSON_MARKER}" if no person is visible`,
    ),
});

export type PersonDescription = z.infer<typeof PersonDescriptionSchema>;

export class NotPersonError extends Error {
  constructor(
    message = "This image doesn't contain a person. Please upload a photo with a clearly visible face.",
  ) {
    super(message);
    this.name = "NotPersonError";
  }
}

export async function describePersonImages(
  imageUrls: string[],
  customApiKey?: string,
): Promise<string> {
  if (imageUrls.length === 0) {
    throw new Error("At least one image URL is required");
  }

  logger.info(
    `[Person Description] Analyzing ${imageUrls.length} image(s) for person description`,
  );

  try {
    const imageContent = imageUrls.map((url) => ({
      type: "image" as const,
      image: url,
    }));

    const result = await generateObject({
      model: getAnalysisModel(customApiKey),
      schema: PersonDescriptionSchema,
      messages: [
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: `<task>
Analyze the image and describe the person, OR reject if no person is visible.
</task>

<instructions>
1. First, determine if a real human person or face is clearly visible
2. If YES: Write a short description (max 15 words, under 100 characters)
3. If NO: Return exactly "${NOT_PERSON_MARKER}"
</instructions>

<output_rules>
- If person visible: Include hair color, glasses, facial hair, hat/cap if visible
- If NO person visible: Return exactly "${NOT_PERSON_MARKER}" (objects, landscapes, animals, logos, text = not a person)
</output_rules>

<examples>
- Person with brown hair and glasses → "Man with brown hair, glasses, and beard wearing black cap."
- Woman's portrait → "Woman with blonde curly hair and red lipstick."
- Photo of a cat → "${NOT_PERSON_MARKER}"
- Landscape image → "${NOT_PERSON_MARKER}"
- Logo or text → "${NOT_PERSON_MARKER}"
</examples>`,
            },
          ],
        },
      ],
    });

    const description = result.object.description;

    if (description === NOT_PERSON_MARKER) {
      logger.info(`[Person Description] Image does not contain a person`);
      throw new NotPersonError();
    }

    logger.info(`[Person Description] Generated description successfully`);
    return description.slice(0, 150);
  } catch (error) {
    if (error instanceof NotPersonError) {
      throw error;
    }
    logger.error(`[Person Description] Failed to generate description`, error);
    throw error;
  }
}

export class ContentPolicyError extends Error {
  constructor(message = "Image violates content policy") {
    super(message);
    this.name = "ContentPolicyError";
  }
}

export function isContentPolicyError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes("safety") ||
      message.includes("policy") ||
      message.includes("blocked") ||
      message.includes("harmful") ||
      message.includes("inappropriate") ||
      message.includes("violates")
    ) {
      return true;
    }

    // Gemini returns blockReason in the response body when content is blocked.
    // The AI SDK wraps this as AI_APICallError -> AI_TypeValidationError with
    // the raw response in the cause chain.
    const causeMessage =
      error.cause instanceof Error ? error.cause.message : "";
    if (causeMessage.includes("blockReason")) {
      return true;
    }
  }
  return false;
}

export async function describeImage(
  params: DescribeImageParams,
): Promise<InspirationAnalysis> {
  const { imageUrl, customApiKey } = params;

  logger.info(
    `[Inspiration Analysis] Starting image analysis for: ${imageUrl}`,
  );

  try {
    const result = await generateObject({
      model: getAnalysisModel(customApiKey),
      schema: InspirationAnalysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageUrl,
            },
            {
              type: "text",
              text: `Analyze this YouTube thumbnail and provide:
1. Give it a short, punchy, attention-grabbing title (2-5 words). Think like a top YouTuber writing clickbait — dramatic, curiosity-inducing, emotional. The title should make someone WANT to click. Use power words: unexpected, secret, final, never, ultimate, impossible, shocking.
2. A detailed description summarizing the visual style using keywords: [color palette], [lighting style], [subject pose/expression], [background type], [overall mood]
3. Category: classify the thumbnail into one of these categories based on content type: Tutorial (how-to, guides), Vlog (personal, day-in-life), Gaming (gameplay, gaming content), Review (products, comparisons), Entertainment (comedy, challenges), News (current events, commentary), Music (music videos, performances), Education (learning, courses), Lifestyle (fashion, beauty, fitness), or Other.

Example output:
- name: "I Survived This" (if showing danger/adventure)
- name: "The Final Betrayal" (if dark dramatic scene)
- name: "Nobody Expected This" (if surprising reveal)
- name: "She Said YES" (if emotional moment)
- name: "Gone In 24 Hours" (if urgency/countdown)
- description: "Warm orange tones, dramatic side lighting, person looking shocked with mouth open, blurred city background, high-energy urgent mood."
- category: "Entertainment" (if it appears to be entertainment/challenge content)`,
            },
          ],
        },
      ],
    });

    logger.info(
      `[Inspiration Analysis] Successfully analyzed image: ${result.object.name}`,
    );

    return result.object;
  } catch (error) {
    logger.error(`[Inspiration Analysis] Failed to analyze image`, error);

    if (isContentPolicyError(error)) {
      throw new ContentPolicyError(
        "This image cannot be processed due to content policy restrictions. Please upload an appropriate image.",
      );
    }

    throw error;
  }
}
