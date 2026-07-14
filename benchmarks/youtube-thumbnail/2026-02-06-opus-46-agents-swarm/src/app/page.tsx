"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { ImageDropzone } from "@/components/image-dropzone";
import { toast } from "sonner";
import { Download, Loader2, Sparkles } from "lucide-react";

type GeneratedImage = {
  data: string;
  mediaType: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [personImages, setPersonImages] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          extraImages: extraImages.map((img) => img.split(",")[1] || img),
          inspirationImage: inspirationImage[0]
            ? inspirationImage[0].split(",")[1] || inspirationImage[0]
            : null,
          personImages: personImages.map((img) => img.split(",")[1] || img),
          count,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResults((prev) => [...data.images, ...prev]);
      toast.success(`Generated ${data.images.length} thumbnail(s)!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (image: GeneratedImage, index: number) => {
    const ext = image.mediaType.split("/")[1] || "png";
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.${ext}`;
    link.click();
  };

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Thumbnail Generator</h1>
        <p className="mt-2 text-muted-foreground">
          AI-powered YouTube thumbnails with Gemini
        </p>
      </header>

      <div className="space-y-6">
        <Textarea
          placeholder="Describe your YouTube thumbnail... (e.g., 'A surprised person looking at a giant golden play button, dramatic lighting, text saying WOW')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none bg-card text-base"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ImageDropzone
            images={extraImages}
            onImagesChange={setExtraImages}
            multiple
            label="Extra Images"
            description="Additional context images"
          />
          <ImageDropzone
            images={inspirationImage}
            onImagesChange={setInspirationImage}
            label="Inspiration"
            description="Style reference image"
          />
          <ImageDropzone
            images={personImages}
            onImagesChange={setPersonImages}
            multiple
            label="Persons"
            description="People to include"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-1 items-center gap-4">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              Count: {count}
            </label>
            <Slider
              value={[count]}
              onValueChange={([v]) => setCount(v)}
              min={1}
              max={4}
              step={1}
              className="max-w-[200px]"
            />
          </div>
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="min-w-[160px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-xl" />
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-muted-foreground">
            Generated Thumbnails
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {results.map((image, i) => (
              <div key={i} className="group relative overflow-hidden rounded-xl border border-border">
                <img
                  src={`data:${image.mediaType};base64,${image.data}`}
                  alt={`Thumbnail ${i + 1}`}
                  className="aspect-video w-full object-cover"
                />
                <div className="absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDownload(image, i)}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
