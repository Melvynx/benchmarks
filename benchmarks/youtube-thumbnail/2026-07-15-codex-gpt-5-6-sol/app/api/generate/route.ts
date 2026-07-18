import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const REQUIRED_DIRECTION =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";

type GenerateRequest = {
  prompt?: unknown;
  images?: unknown;
  count?: unknown;
  referenceCounts?: {
    extra?: unknown;
    inspiration?: unknown;
    persons?: unknown;
  };
};

function safeCount(value: unknown) {
  const count = typeof value === "number" ? Math.floor(value) : 1;
  return Math.min(Math.max(count, 1), 4);
}

function safeReferenceCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest;
    if (typeof body.prompt !== "string" || !body.prompt.trim()) {
      return Response.json({ error: "A thumbnail prompt is required." }, { status: 400 });
    }

    const images = Array.isArray(body.images)
      ? body.images
          .filter(
            (image): image is string =>
              typeof image === "string" && image.startsWith("data:image/"),
          )
          .slice(0, 9)
      : [];
    const count = safeCount(body.count);
    const extraCount = safeReferenceCount(body.referenceCounts?.extra);
    const inspirationCount = safeReferenceCount(body.referenceCounts?.inspiration);
    const personsCount = safeReferenceCount(body.referenceCounts?.persons);
    const referenceNote = images.length
      ? `Reference image order: ${extraCount} extra visual element(s), ${inspirationCount} style inspiration image(s), then ${personsCount} person likeness image(s). Use them according to those roles.`
      : "";
    const fullPrompt = [body.prompt.trim(), referenceNote, REQUIRED_DIRECTION]
      .filter(Boolean)
      .join("\n\n");

    const generations = await Promise.all(
      Array.from({ length: count }, async () =>
        generateText({
          model: google("gemini-3-pro-image-preview"),
          providerOptions: {
            google: { responseModalities: ["TEXT", "IMAGE"] },
          },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: fullPrompt },
                ...images.map((image) => ({
                  type: "image" as const,
                  image,
                })),
              ],
            },
          ],
        }),
      ),
    );

    const generatedImages = generations.flatMap((result) =>
      (result.files ?? [])
        .filter((file) => file.mediaType.startsWith("image/"))
        .map((file) => ({
          data: file.base64,
          mediaType: file.mediaType,
        })),
    );

    if (generatedImages.length === 0) {
      return Response.json(
        { error: "Gemini completed the request without returning an image." },
        { status: 502 },
      );
    }

    return Response.json({ images: generatedImages });
  } catch (error) {
    console.error("Thumbnail generation failed", error);
    const message =
      error instanceof Error && error.message.includes("API key")
        ? "Google AI API key is missing or invalid."
        : "Thumbnail generation failed. Please try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
