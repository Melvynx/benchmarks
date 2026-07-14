"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/components/image-upload";
import { ThumbnailDisplay } from "@/components/thumbnail-display";

interface GeneratedImage {
  data: string;
  mediaType: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [personImages, setPersonImages] = useState<string[]>([]);
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
      const allImages = [...extraImages, ...inspirationImage, ...personImages];
      
      const processedImages = allImages.map((img) => {
        if (img.startsWith("data:")) {
          return img.split(",")[1];
        }
        return img;
      });

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          images: processedImages,
          count,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate thumbnails");
      }

      setGeneratedImages(data.images);
      toast.success(`Generated ${data.images.length} thumbnail(s)`);
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate thumbnails");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            YouTube Thumbnail Generator
          </h1>
          <p className="text-muted-foreground">
            Create stunning thumbnails with AI
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="prompt"
              className="text-sm font-medium text-foreground"
            >
              Describe your thumbnail
            </label>
            <Textarea
              id="prompt"
              placeholder="A dramatic tech review setup with RGB lighting, bold text 'BEST LAPTOP 2024', person looking surprised..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none bg-muted/50 border-border focus:border-primary"
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImageUpload
              label="Extra Images"
              description="Additional context images"
              images={extraImages}
              onImagesChange={setExtraImages}
              multiple
              maxFiles={3}
            />
            <ImageUpload
              label="Inspiration"
              description="Style reference"
              images={inspirationImage}
              onImagesChange={setInspirationImage}
              multiple={false}
            />
            <ImageUpload
              label="Persons"
              description="People to include"
              images={personImages}
              onImagesChange={setPersonImages}
              multiple
              maxFiles={3}
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="w-full sm:w-64 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Number of thumbnails
                </label>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
              <Slider
                value={[count]}
                onValueChange={(value) => setCount(value[0])}
                min={1}
                max={4}
                step={1}
                disabled={isLoading}
              />
            </div>

            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          </div>

          <div className="border-t border-border pt-6 mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Generated Thumbnails
            </h2>
            <ThumbnailDisplay
              images={generatedImages}
              isLoading={isLoading}
              count={count}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
