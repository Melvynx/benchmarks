"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Sparkles, Users, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/components/image-upload";

type GeneratedImage = {
  data: string;
  mediaType: string;
};

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [personImages, setPersonImages] = useState<string[]>([]);
  const [count, setCount] = useState(2);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    setGeneratedImages([]);

    try {
      const allImages = [...extraImages, ...inspirationImages, ...personImages];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          images: allImages,
          count,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.images?.length === 0) {
        toast.error("No images were generated. Try a different prompt.");
        return;
      }

      setGeneratedImages(data.images);
      toast.success(`Generated ${data.images.length} thumbnail${data.images.length > 1 ? "s" : ""}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (image: GeneratedImage, index: number) => {
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Thumbnail Generator</h1>
          <p className="mt-2 text-muted-foreground">
            Generate stunning YouTube thumbnails with AI
          </p>
        </div>

        <div className="space-y-6">
          <Textarea
            placeholder="Describe your YouTube thumbnail..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] resize-none text-base"
          />

          <div className="grid gap-4 md:grid-cols-3">
            <ImageUpload
              label="Extra Images"
              description="Reference images"
              multiple={true}
              images={extraImages}
              onImagesChange={setExtraImages}
              icon={<ImagePlus className="h-6 w-6" />}
            />
            <ImageUpload
              label="Inspiration"
              description="Style reference"
              multiple={false}
              images={inspirationImages}
              onImagesChange={setInspirationImages}
              icon={<Sparkles className="h-6 w-6" />}
            />
            <ImageUpload
              label="Persons"
              description="People to include"
              multiple={true}
              images={personImages}
              onImagesChange={setPersonImages}
              icon={<Users className="h-6 w-6" />}
            />
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Count: {count}
              </span>
              <Slider
                value={[count]}
                onValueChange={(v) => setCount(v[0])}
                min={1}
                max={4}
                step={1}
                className="w-32"
              />
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>

          {(loading || generatedImages.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {loading
                ? Array.from({ length: count }).map((_, i) => (
                    <Skeleton key={i} className="aspect-video w-full rounded-xl" />
                  ))
                : generatedImages.map((image, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-xl border border-border"
                    >
                      <img
                        src={`data:${image.mediaType};base64,${image.data}`}
                        alt={`Generated thumbnail ${i + 1}`}
                        className="aspect-video w-full object-cover"
                      />
                      <button
                        onClick={() => handleDownload(image, i)}
                        className="absolute bottom-3 right-3 rounded-lg bg-black/70 p-2 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                      >
                        <Download className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
