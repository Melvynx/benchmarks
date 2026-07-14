import { google } from "@ai-sdk/google"
import { generateText } from "ai"

const MAX_IMAGES = 20
const MAX_COUNT = 4
const MIN_COUNT = 1
const PROMPT_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors"

type RequestBody = {
  prompt?: string
  images?: string[]
  count?: number
}

type GeneratedImage = {
  data: string
  mediaType: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody

    const prompt = body.prompt?.trim()
    if (!prompt) {
      return Response.json({ error: "Prompt is required." }, { status: 400 })
    }

    const referenceImages = Array.isArray(body.images)
      ? body.images
          .filter((image): image is string => typeof image === "string")
          .slice(0, MAX_IMAGES)
      : []

    const rawCount = Number(body.count)
    const count = Number.isFinite(rawCount)
      ? Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.floor(rawCount)))
      : MIN_COUNT

    const finalPrompt = `${prompt}\n\n${PROMPT_SUFFIX}`

    const requests = Array.from({ length: count }, () =>
      generateText({
        model: google("gemini-3-pro-image-preview"),
        providerOptions: {
          google: { responseModalities: ["TEXT", "IMAGE"] },
        },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              ...referenceImages.map((image) => ({
                type: "image" as const,
                image,
              })),
            ],
          },
        ],
      })
    )

    const results = await Promise.all(requests)

    const images: GeneratedImage[] = []
    for (const result of results) {
      for (const file of result.files) {
        if (file.mediaType.startsWith("image/")) {
          images.push({
            data: file.base64,
            mediaType: file.mediaType,
          })
        }
      }
    }

    if (images.length === 0) {
      return Response.json(
        { error: "The model did not return an image. Try adjusting the prompt." },
        { status: 502 }
      )
    }

    return Response.json({ images })
  } catch (error) {
    console.error("Thumbnail generation failed:", error)

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while generating thumbnails.",
      },
      { status: 500 }
    )
  }
}
