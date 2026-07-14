"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { generateThumbnail } from "./actions"
import { Upload, X, Download, Moon, Sun, Sparkles } from "lucide-react"

export default function Home() {
  const [isDark, setIsDark] = useState(false)
  const [faceImages, setFaceImages] = useState<string[]>([])
  const [inspiration, setInspiration] = useState<string>("")
  const [extraImages, setExtraImages] = useState<string[]>([])
  const [prompt, setPrompt] = useState("")
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const faceInputRef = useRef<HTMLInputElement>(null)
  const inspirationInputRef = useRef<HTMLInputElement>(null)
  const extraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
    })
  }

  const handleFaceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const base64s = await Promise.all(Array.from(files).map(fileToBase64))
      setFaceImages((prev) => [...prev, ...base64s])
    }
  }

  const handleInspirationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const base64 = await fileToBase64(file)
      setInspiration(base64)
    }
  }

  const handleExtraUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const base64s = await Promise.all(Array.from(files).map(fileToBase64))
      setExtraImages((prev) => [...prev, ...base64s])
    }
  }

  const removeFaceImage = (index: number) => {
    setFaceImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeInspiration = () => {
    setInspiration("")
  }

  const removeExtraImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index))
  }

  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement("a")
    link.href = dataUrl
    link.download = `thumbnail-${index + 1}.png`
    link.click()
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setError("")
    setGeneratedImages([])

    try {
      const formData = new FormData()
      formData.append("prompt", prompt)
      faceImages.forEach((img) => formData.append("faceImages", img))
      if (inspiration) formData.append("inspiration", inspiration)
      extraImages.forEach((img) => formData.append("extraImages", img))

      const result = await generateThumbnail(formData)
      const imageUrls = result.map((file: any) => file.uri)
      setGeneratedImages(imageUrls)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate thumbnails")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold">YouTube Thumbnail Generator</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe your thumbnail... (e.g., 'Tech review with excited expression, blue background')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-4" />
                Face References
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {faceImages.map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-md" />
                    <button
                      onClick={() => removeFaceImage(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => faceInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md flex items-center justify-center hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <PlusIcon />
                </button>
              </div>
              <input
                ref={faceInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFaceUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-4" />
                Inspiration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inspiration ? (
                <div className="relative aspect-video mb-3">
                  <img src={inspiration} alt="" className="w-full h-full object-cover rounded-md" />
                  <button
                    onClick={removeInspiration}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => inspirationInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md flex flex-col items-center justify-center gap-2 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <Upload className="size-6 text-zinc-400" />
                  <span className="text-sm text-zinc-500">Upload reference thumbnail</span>
                </button>
              )}
              <input
                ref={inspirationInputRef}
                type="file"
                accept="image/*"
                onChange={handleInspirationUpload}
                className="hidden"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="size-4" />
                Extra Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {extraImages.map((img, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-md" />
                    <button
                      onClick={() => removeExtraImage(i)}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => extraInputRef.current?.click()}
                  className="aspect-square border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md flex items-center justify-center hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <PlusIcon />
                </button>
              </div>
              <input
                ref={extraInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleExtraUpload}
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mb-8">
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Sparkles className="size-4 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Generate Thumbnail
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {generatedImages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Thumbnails</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={img}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full aspect-video object-cover rounded-lg"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => downloadImage(img, i)}
                        className="gap-2"
                      >
                        <Download className="size-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function PlusIcon() {
  return <svg className="size-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
}
