import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { generateText, type UserContent } from "ai";

import { THUMBNAIL_SUFFIX } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 120;

type GenerateBody = {
  prompt?: string;
  images?: string[];
  extra?: string[];
  inspiration?: string[];
  persons?: string[];
  count?: number;
};

type GeneratedImage = {
  data: string;
  mediaType: string;
};

const DATA_URL = /^data:image\/[a-zA-Z0-9.+-]+;base64,/;

function clampCount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(4, Math.max(1, Math.round(parsed)));
}

function cleanImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function assertImages(images: string[]) {
  for (const image of images) {
    if (!DATA_URL.test(image)) {
      throw new Error("Each upload must be an image.");
    }
  }
}

function buildContent(
  prompt: string,
  groups: { label: string; images: string[] }[],
): UserContent {
  const content: UserContent = [{ type: "text", text: prompt }];

  for (const group of groups) {
    if (group.images.length === 0) continue;
    content.push({ type: "text", text: group.label });
    for (const image of group.images) {
      content.push({ type: "image", image });
    }
  }

  return content;
}

async function generateOne(
  prompt: string,
  groups: { label: string; images: string[] }[],
): Promise<GeneratedImage[]> {
  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    abortSignal: AbortSignal.timeout(90_000),
    providerOptions: {
      google: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "16:9" },
      } satisfies GoogleLanguageModelOptions,
    },
    messages: [
      {
        role: "user",
        content: buildContent(prompt, groups),
      },
    ],
  });

  const generatedImages: GeneratedImage[] = [];
  for (const file of result.files ?? []) {
    if (file.mediaType.startsWith("image/")) {
      generatedImages.push({
        data: file.base64,
        mediaType: file.mediaType,
      });
    }
  }
  return generatedImages;
}

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY is not set." },
        { status: 500 },
      );
    }

    const body = (await req.json()) as GenerateBody;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const extra = cleanImages(body.extra);
    const inspiration = cleanImages(body.inspiration).slice(0, 1);
    const persons = cleanImages(body.persons);
    const flat = cleanImages(body.images);
    const groups =
      extra.length + inspiration.length + persons.length > 0
        ? [
            { label: "Extra reference images:", images: extra },
            { label: "Inspiration image. Match this style:", images: inspiration },
            { label: "Persons who should appear in the thumbnail:", images: persons },
          ]
        : [{ label: "Reference images:", images: flat }];

    const attached = groups.flatMap((group) => group.images);
    assertImages(attached);

    const count = clampCount(body.count);
    const batches = await Promise.allSettled(
      Array.from({ length: count }, (_, index) => {
        const variation =
          count > 1
            ? `Variation ${index + 1} of ${count}. Make this option visually distinct.\n\n`
            : "";
        const fullPrompt = `${prompt}\n\n${variation}${THUMBNAIL_SUFFIX}`;
        return generateOne(fullPrompt, groups);
      }),
    );

    const generatedImages = batches.flatMap((batch) =>
      batch.status === "fulfilled" ? batch.value : [],
    );

    if (generatedImages.length === 0) {
      const failure = batches.find((batch) => batch.status === "rejected");
      const message =
        failure && failure.status === "rejected"
          ? failure.reason instanceof Error
            ? failure.reason.message
            : "The model returned no images."
          : "The model returned no images.";
      return Response.json({ error: message }, { status: 502 });
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    const status = message === "Each upload must be an image." ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
