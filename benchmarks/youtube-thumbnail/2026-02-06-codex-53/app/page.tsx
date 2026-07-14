"use client"

import { DownloadIcon, Loader2Icon, SparklesIcon } from "lucide-react"
import Image from "next/image"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { UploadImage, UploadZone } from "@/components/upload-zone"

const MAX_EXTRA_IMAGES = 8
const MAX_PERSON_IMAGES = 6

type GeneratedImage = {
  data: string
  mediaType: string
}

type GenerateResponse = {
  images?: GeneratedImage[]
  error?: string
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("Could not read file data."))
    }

    reader.onerror = () => reject(reader.error ?? new Error("File read failed."))
    reader.readAsDataURL(file)
  })
}

async function filesToUploadImages(files: File[]): Promise<UploadImage[]> {
  return Promise.all(
    files.map(async (file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      dataUrl: await fileToDataUrl(file),
    }))
  )
}

function buildImageDataUrl(image: GeneratedImage) {
  return `data:${image.mediaType};base64,${image.data}`
}

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const [count, setCount] = useState(1)

  const [extraImages, setExtraImages] = useState<UploadImage[]>([])
  const [inspirationImage, setInspirationImage] = useState<UploadImage[]>([])
  const [persons, setPersons] = useState<UploadImage[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])

  const referenceImages = useMemo(
    () => [...extraImages, ...inspirationImage, ...persons].map((file) => file.dataUrl),
    [extraImages, inspirationImage, persons]
  )

  async function handleAddExtraImages(files: File[]) {
    try {
      const uploadImages = await filesToUploadImages(files)
      setExtraImages((current) => {
        const next = [...current, ...uploadImages]
        if (next.length > MAX_EXTRA_IMAGES) {
          toast.info(`Extra images limited to ${MAX_EXTRA_IMAGES}.`)
        }
        return next.slice(0, MAX_EXTRA_IMAGES)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.")
    }
  }

  async function handleAddInspiration(files: File[]) {
    try {
      const uploadImages = await filesToUploadImages(files.slice(0, 1))
      setInspirationImage(uploadImages.slice(-1))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.")
    }
  }

  async function handleAddPersons(files: File[]) {
    try {
      const uploadImages = await filesToUploadImages(files)
      setPersons((current) => {
        const next = [...current, ...uploadImages]
        if (next.length > MAX_PERSON_IMAGES) {
          toast.info(`Persons limited to ${MAX_PERSON_IMAGES}.`)
        }
        return next.slice(0, MAX_PERSON_IMAGES)
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.")
    }
  }

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      toast.error("Please enter a prompt.")
      return
    }

    setIsLoading(true)
    setGeneratedImages([])

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          images: referenceImages,
          count,
        }),
      })

      const data = (await response.json()) as GenerateResponse
      if (!response.ok) {
        throw new Error(data.error ?? "Generation failed.")
      }

      if (!data.images || data.images.length === 0) {
        throw new Error("No images were returned.")
      }

      setGeneratedImages(data.images)
      toast.success(`Generated ${data.images.length} thumbnail(s).`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleDownload(image: GeneratedImage, index: number) {
    const link = document.createElement("a")
    const extension = image.mediaType.split("/")[1] || "png"
    link.href = buildImageDataUrl(image)
    link.download = `thumbnail-${index + 1}.${extension}`
    link.click()
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(58,58,58,0.45)_0%,rgba(10,10,10,1)_45%)] px-4 py-8 text-foreground md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="fade-in-up flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Gemini Image Lab
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-3xl">
              Thumbfast by Codex 5.3
            </h1>
          </div>
          <ThemeToggle />
        </header>

        <Card className="fade-in-up border-zinc-800/60 bg-white/90 shadow-xl backdrop-blur-sm dark:bg-zinc-950/65">
          <CardContent className="space-y-6 p-5 md:p-8">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm text-zinc-700 dark:text-zinc-200">
                Prompt
              </Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="A dramatic close-up of a creator reacting to a shocking AI breakthrough, cinematic lighting, high contrast..."
                className="min-h-36 resize-none border-zinc-300 bg-zinc-50 text-base text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                The app always appends: Create a YouTube thumbnail in 16:9 ratio,
                photorealistic, high quality, vibrant colors.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <UploadZone
                title="Extra Images"
                description="Upload supporting references (multiple files)."
                files={extraImages}
                onFilesAdded={handleAddExtraImages}
                onRemove={(id) =>
                  setExtraImages((current) => current.filter((file) => file.id !== id))
                }
                multiple
                maxFiles={MAX_EXTRA_IMAGES}
              />

              <UploadZone
                title="Inspiration"
                description="Single style reference image."
                files={inspirationImage}
                onFilesAdded={handleAddInspiration}
                onRemove={(id) =>
                  setInspirationImage((current) =>
                    current.filter((file) => file.id !== id)
                  )
                }
                maxFiles={1}
              />

              <UploadZone
                title="Persons"
                description="Upload faces/people references (multiple files)."
                files={persons}
                onFilesAdded={handleAddPersons}
                onRemove={(id) =>
                  setPersons((current) => current.filter((file) => file.id !== id))
                }
                multiple
                maxFiles={MAX_PERSON_IMAGES}
              />
            </div>

            <div className="flex flex-col gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <Label htmlFor="count" className="text-sm text-zinc-700 dark:text-zinc-200">
                  Count
                </Label>
                <select
                  id="count"
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  className="h-10 rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={handleGenerate}
                disabled={isLoading}
                className="h-10 min-w-44 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isLoading ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Generated Thumbnails
          </h2>

          {isLoading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: count }).map((_, index) => (
                <Card
                  key={index}
                  className="overflow-hidden border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/65"
                >
                  <CardContent className="space-y-3 p-3">
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <Skeleton className="h-9 w-32 rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && generatedImages.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {generatedImages.map((image, index) => (
                <Card
                  key={`${image.data.slice(0, 24)}-${index}`}
                  className="overflow-hidden border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/65"
                >
                  <CardContent className="space-y-3 p-3">
                    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <Image
                        src={buildImageDataUrl(image)}
                        alt={`Generated thumbnail ${index + 1}`}
                        width={1280}
                        height={720}
                        className="aspect-video w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDownload(image, index)}
                      className="border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <DownloadIcon />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && generatedImages.length === 0 && (
            <Card className="border-zinc-200 bg-white/85 dark:border-zinc-800 dark:bg-zinc-950/60">
              <CardContent className="p-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                Enter a prompt and click Generate to create thumbnails.
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  )
}
