"use client";

import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

type GeneratedImage = {
  data: string;
  mediaType: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspiration, setInspiration] = useState<string[]>([]);
  const [persons, setPersons] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    setGeneratedImages([]);

    try {
      const allImages = [...extraImages, ...inspiration, ...persons];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images: allImages,
          count,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGeneratedImages(data.images);
      toast.success(`Generated ${data.images.length} thumbnail(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = (image: GeneratedImage, index: number) => {
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.png`;
    link.click();
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            YouTube Thumbnail Generator
          </h1>
          <p className="text-muted-foreground">
            Create stunning thumbnails with AI
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <Textarea
              placeholder="Describe your thumbnail... e.g., 'A shocked face looking at a pile of money with text MADE $1M'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none bg-card/30 text-lg placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ImageDropzone
              label="Extra Images"
              description="Reference images"
              images={extraImages}
              onImagesChange={setExtraImages}
              multiple
            />
            <ImageDropzone
              label="Inspiration"
              description="Style reference"
              images={inspiration}
              onImagesChange={setInspiration}
            />
            <ImageDropzone
              label="Persons"
              description="People to include"
              images={persons}
              onImagesChange={setPersons}
              multiple
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Count:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                      count === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/50 text-muted-foreground hover:bg-card"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              size="lg"
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {(isLoading || generatedImages.length > 0) && (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-semibold">Generated Thumbnails</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {isLoading
                ? Array.from({ length: count }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video rounded-lg" />
                  ))
                : generatedImages.map((image, index) => (
                    <div
                      key={index}
                      className="group relative overflow-hidden rounded-lg bg-card"
                    >
                      <Image
                        src={`data:${image.mediaType};base64,${image.data}`}
                        alt={`Generated thumbnail ${index + 1}`}
                        width={1280}
                        height={720}
                        className="aspect-video w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => downloadImage(image, index)}
                          className="gap-2"
                        >
                          <Download className="size-4" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
