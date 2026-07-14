import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const MAX_REFERENCE_IMAGES = 14;
const MAX_COUNT = 4;
const PROMPT_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";

type ImageInput = {
  dataUrl: string;
  mediaType?: string;
  name?: string;
};

type GenerateRequest = {
  count?: number;
  extraImages?: ImageInput[];
  inspirationImage?: ImageInput | null;
  personImages?: ImageInput[];
  prompt?: string;
};

class RouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;

function isImageInput(value: unknown): value is ImageInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const image = value as Record<string, unknown>;

  return (
    typeof image.dataUrl === "string" &&
    image.dataUrl.startsWith("data:image/") &&
    (typeof image.mediaType === "undefined" ||
      (typeof image.mediaType === "string" &&
        image.mediaType.startsWith("image/")))
  );
}

function extractBase64FromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new RouteError("Image data must be a valid base64 data URL.");
  }

  return {
    mediaType: match[1],
    base64: match[2],
  };
}

function assertRequest(body: GenerateRequest) {
  if (typeof body.prompt !== "string" || !body.prompt.trim()) {
    throw new RouteError("A prompt is required.");
  }

  if (
    typeof body.count !== "number" ||
    !Number.isInteger(body.count) ||
    body.count < 1 ||
    body.count > MAX_COUNT
  ) {
    throw new RouteError("Count must be an integer between 1 and 4.");
  }

  if (
    !Array.isArray(body.extraImages) ||
    !Array.isArray(body.personImages) ||
    !body.extraImages.every(isImageInput) ||
    !body.personImages.every(isImageInput)
  ) {
    throw new RouteError("Reference images are invalid.");
  }

  if (body.inspirationImage && !isImageInput(body.inspirationImage)) {
    throw new RouteError("Inspiration image is invalid.");
  }
}

function buildPrompt({
  prompt,
  extraImages,
  inspirationImage,
  personImages,
}: Required<Pick<GenerateRequest, "extraImages" | "personImages" | "prompt">> &
  Pick<GenerateRequest, "inspirationImage">) {
  return [
    prompt.trim(),
    inspirationImage
      ? "Use the inspiration image to guide the overall aesthetic, mood, and composition."
      : null,
    personImages.length > 0
      ? "Preserve the identity, facial structure, and recognizable features of the referenced people."
      : null,
    extraImages.length > 0
      ? "Use the extra reference images for visual cues, styling, props, background treatment, and lighting."
      : null,
    PROMPT_SUFFIX,
  ]
    .filter(Boolean)
    .join(" ");
}

async function generateSingleThumbnail(prompt: string, images: ImageInput[]) {
  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    providerOptions: {
      google: {
        imageConfig: {
          aspectRatio: "16:9",
        },
        responseModalities: ["TEXT", "IMAGE"],
      },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...images.map((image) => {
            const { base64, mediaType } = extractBase64FromDataUrl(image.dataUrl);

            return {
              type: "image" as const,
              image: base64,
              mediaType: image.mediaType ?? mediaType,
            };
          }),
        ],
      },
    ],
  });

  for (const file of result.files ?? []) {
    if (file.mediaType.startsWith("image/")) {
      return {
        data: file.base64,
        mediaType: file.mediaType,
      };
    }
  }

  throw new RouteError("The model returned no generated images.", 502);
}

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new RouteError(
        "Missing GOOGLE_GENERATIVE_AI_API_KEY in the server environment.",
        500,
      );
    }

    const body = (await request.json()) as GenerateRequest;
    assertRequest(body);
    const promptInput = body.prompt ?? "";
    const count = body.count ?? 1;
    const extraImages = body.extraImages ?? [];
    const personImages = body.personImages ?? [];
    const inspirationImage = body.inspirationImage ?? null;

    const references = [
      ...extraImages,
      ...(inspirationImage ? [inspirationImage] : []),
      ...personImages,
    ];

    if (references.length > MAX_REFERENCE_IMAGES) {
      throw new RouteError(
        `A maximum of ${MAX_REFERENCE_IMAGES} reference images is allowed.`,
      );
    }

    const prompt = buildPrompt({
      prompt: promptInput,
      extraImages,
      inspirationImage,
      personImages,
    });

    const generations = await Promise.allSettled(
      Array.from({ length: count }, () =>
        generateSingleThumbnail(prompt, references),
      ),
    );

    const images = generations.flatMap((generation) =>
      generation.status === "fulfilled" ? [generation.value] : [],
    );

    if (images.length === 0) {
      const firstError = generations.find(
        (generation) => generation.status === "rejected",
      );

      throw (
        (firstError as PromiseRejectedResult | undefined)?.reason ??
        new RouteError("Failed to generate thumbnails.", 502)
      );
    }

    const failures = generations.length - images.length;

    return Response.json({
      images,
      warning:
        failures > 0
          ? `Generated ${images.length} of ${count} requested thumbnails.`
          : undefined,
    });
  } catch (error) {
    const status =
      error instanceof RouteError
        ? error.status
        : error instanceof Error &&
            "status" in error &&
            typeof error.status === "number"
          ? error.status
          : 500;

    const message =
      error instanceof Error ? error.message : "Failed to generate thumbnails.";

    return Response.json({ error: message }, { status });
  }
}
