import { google } from "@ai-sdk/google";
import { generateText } from "ai";

const THUMBNAIL_PROMPT_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors.";

type GenerateRequest = {
  prompt?: string;
  count?: number;
  images?: Array<{
    dataUrl?: string;
    mediaType?: string;
  }>;
};

type IncomingImage = NonNullable<GenerateRequest["images"]>[number];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const prompt = body.prompt?.trim();
    const count = clampCount(body.count);
    const images = (body.images ?? [])
      .map(parseIncomingImage)
      .filter((image): image is NonNullable<ReturnType<typeof parseIncomingImage>> =>
        Boolean(image),
      );

    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY." },
        { status: 500 },
      );
    }

    const fullPrompt = `${prompt}. ${THUMBNAIL_PROMPT_SUFFIX}`;

    const results = await Promise.all(
      Array.from({ length: count }, async (_, index) => {
        const result = await generateText({
          model: google("gemini-3-pro-image-preview"),
          providerOptions: {
            google: { responseModalities: ["TEXT", "IMAGE"] },
          },
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    count > 1
                      ? `${fullPrompt} Produce a distinct variation ${index + 1} of ${count}.`
                      : fullPrompt,
                },
                ...images.map((image) => ({
                  type: "image" as const,
                  image: image.base64,
                  mediaType: image.mediaType,
                })),
              ],
            },
          ],
        });

        const generatedImages =
          result.files?.flatMap((file) =>
            file.mediaType.startsWith("image/")
              ? [
                  {
                    id: crypto.randomUUID(),
                    data: file.base64,
                    mediaType: file.mediaType,
                  },
                ]
              : [],
          ) ?? [];

        return generatedImages;
      }),
    );

    const generatedImages = results.flat();

    if (generatedImages.length === 0) {
      return Response.json(
        { error: "The model returned no images." },
        { status: 502 },
      );
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while generating thumbnails.",
      },
      { status: 500 },
    );
  }
}

function clampCount(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 1;
  }

  return Math.min(4, Math.max(1, Math.round(value)));
}

function parseIncomingImage(image: IncomingImage | undefined) {
  if (!image?.dataUrl || !image.mediaType) {
    return null;
  }

  const [, base64 = ""] = image.dataUrl.split(",");

  if (!base64) {
    return null;
  }

  return {
    base64,
    mediaType: image.mediaType,
  };
}
