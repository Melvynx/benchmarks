import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { buildThumbnailPrompt } from "@/lib/prompt";

export const maxDuration = 300;

type Body = {
  prompt?: string;
  images?: string[];
  count?: number;
};

async function generateOne(fullPrompt: string, images: string[]) {
  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: fullPrompt },
          ...images.map((img) => ({
            type: "image" as const,
            image: img,
          })),
        ],
      },
    ],
  });

  const generatedImages: { data: string; mediaType: string }[] = [];
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
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt = "", images = [], count = 1 } = body;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" },
      { status: 500 }
    );
  }

  const n = Math.min(4, Math.max(1, Math.floor(Number(count)) || 1));
  const fullPrompt = buildThumbnailPrompt(
    typeof prompt === "string" ? prompt : ""
  );

  const refs = Array.isArray(images) ? images.filter(Boolean) : [];

  try {
    const batches = await Promise.all(
      Array.from({ length: n }, () => generateOne(fullPrompt, refs))
    );

    const flat = batches.flat();

    return Response.json({ images: flat });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[generate]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
