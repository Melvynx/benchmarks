"use server"

import { google } from "@ai-sdk/google"
import { generateText } from "ai"

export async function generateThumbnail(formData: FormData) {
  const prompt = formData.get("prompt") as string
  const faceImages = formData.getAll("faceImages") as string[]
  const inspiration = formData.get("inspiration") as string
  const extraImages = formData.getAll("extraImages") as string[]

  const parts: string[] = ["Create a YouTube thumbnail in 16:9 ratio"]

  if (prompt) {
    parts.push(prompt)
  }

  if (faceImages.length > 0) {
    parts.push("Include the face from the reference images")
  }

  const fullPrompt = parts.join(". ")

  const images: string[] = [...faceImages]
  if (inspiration) images.push(inspiration)
  images.push(...extraImages)

  const content: ({ type: "text"; text: string } | { type: "image"; image: string })[] = [
    { type: "text" as const, text: fullPrompt },
    ...images.map((img) => ({ type: "image" as const, image: img })),
  ]

  const result = await generateText({
    model: google("gemini-3-pro-image-preview"),
    messages: [
      {
        role: "user",
        content,
      },
    ],
  })

  const files = result.files || []
  return files.map((file: any) => {
    if (file.uint8ArrayData) {
      const base64 = Buffer.from(file.uint8ArrayData).toString("base64")
      return `data:${file.mediaType};base64,${base64}`
    }
    return file.base64Data || file.uri || ""
  }).filter(Boolean)
}
