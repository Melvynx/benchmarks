import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 300;

interface ImagePayload {
  dataUrl: string;
}

interface GenerateBody {
  prompt: string;
  count?: number;
  extras?: ImagePayload[];
  inspiration?: ImagePayload[];
  persons?: ImagePayload[];
}

const BASE_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";

function buildFinalPrompt(body: GenerateBody): string {
  const parts: string[] = [body.prompt.trim()];

  if (body.inspiration && body.inspiration.length > 0) {
    parts.push(
      "Use the attached inspiration image as a strong style, composition, and color reference."
    );
  }
  if (body.extras && body.extras.length > 0) {
    parts.push(
      "Incorporate the elements, objects, or subjects from the extra reference images into the scene."
    );
  }
  if (body.persons && body.persons.length > 0) {
    parts.push(
      "Preserve the identity, face, and likeness of the person(s) in the attached portrait image(s). Their face must remain clearly recognizable."
    );
  }

  parts.push(BASE_SUFFIX);
  return parts.join("\n\n");
}

function collectImageParts(body: GenerateBody) {
  const all = [
    ...(body.inspiration ?? []),
    ...(body.extras ?? []),
    ...(body.persons ?? []),
  ];
  return all.map((img) => ({
    type: "image" as const,
    image: img.dataUrl,
  }));
}

async function generateOne(body: GenerateBody) {
  const finalPrompt = buildFinalPrompt(body);
  const imageParts = collectImageParts(body);

  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: finalPrompt }, ...imageParts],
      },
    ],
  });

  const generated: { data: string; mediaType: string }[] = [];
  for (const file of result.files ?? []) {
    if (file.mediaType.startsWith("image/")) {
      generated.push({
        data: file.base64,
        mediaType: file.mediaType,
      });
    }
  }
  return generated;
}

export async function POST(req: Request) {
  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prompt || body.prompt.trim().length === 0) {
    return Response.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      {
        error:
          "GOOGLE_GENERATIVE_AI_API_KEY is not configured. Add it to .env.local.",
      },
      { status: 500 }
    );
  }

  const count = Math.min(Math.max(body.count ?? 1, 1), 4);

  try {
    const batches = await Promise.all(
      Array.from({ length: count }, () => generateOne(body))
    );
    const images = batches.flat();

    if (images.length === 0) {
      return Response.json(
        { error: "No image was returned by the model." },
        { status: 502 }
      );
    }

    return Response.json({ images });
  } catch (error) {
    console.error("generate error", error);
    const message =
      error instanceof Error ? error.message : "Generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
