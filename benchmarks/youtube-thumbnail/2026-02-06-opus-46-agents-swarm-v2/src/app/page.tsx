"use client";

import { useState } from "react";
import { ImageDropzone } from "@/components/image-dropzone";
import { ThumbnailGrid } from "@/components/thumbnail-grid";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [personImages, setPersonImages] = useState<string[]>([]);
  const [count, setCount] = useState<number[]>([1]);
  const [generatedImages, setGeneratedImages] = useState<
    { data: string; mediaType: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    try {
      const allImages = [
        ...extraImages,
        ...inspirationImage,
        ...personImages,
      ];
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, images: allImages, count: count[0] }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Generation failed");
      }

      setGeneratedImages(data.images);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Thumbnail Generator
          </h1>
          <p className="text-muted-foreground">
            Create stunning YouTube thumbnails with AI
          </p>
        </div>

        <textarea
          placeholder="Describe your thumbnail..."
          className="w-full rounded-lg border border-border bg-card p-4 text-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ImageDropzone
            label="Extra Images"
            description="Additional reference images"
            images={extraImages}
            onImagesChange={setExtraImages}
            multiple
            maxFiles={5}
          />
          <ImageDropzone
            label="Inspiration"
            description="Style reference image"
            images={inspirationImage}
            onImagesChange={setInspirationImage}
            multiple={false}
          />
          <ImageDropzone
            label="Persons"
            description="People to include"
            images={personImages}
            onImagesChange={setPersonImages}
            multiple
            maxFiles={5}
          />
        </div>

        <Separator />

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Count: {count[0]}
            </span>
            <Slider
              min={1}
              max={4}
              step={1}
              value={count}
              onValueChange={setCount}
              className="max-w-[200px]"
            />
          </div>
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={isLoading}
            className="min-w-[160px]"
          >
            {isLoading ? "Generating..." : "Generate"}
          </Button>
        </div>

        <Separator />

        <ThumbnailGrid
          images={generatedImages}
          isLoading={isLoading}
          count={count[0]}
        />
      </div>
    </main>
  );
}
