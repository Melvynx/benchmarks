"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "./image-upload";
import { ThumbnailDisplay } from "./thumbnail-display";
import { toast } from "sonner";

interface GeneratedImage {
  data: string;
  mediaType: string;
}

export function ThumbnailGenerator() {
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

      const newImages: GeneratedImage[] = [];

      for (let i = 1; i <= count; i++) {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            images: allImages,
            count: i,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to generate image");
        }

        if (data.images && data.images.length > 0) {
          newImages.push(...data.images);
        }
      }

      setGeneratedImages(newImages);
      toast.success(`Generated ${newImages.length} thumbnail(s)`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate thumbnails"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Main Prompt Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-muted-foreground">
          Describe your thumbnail
        </label>
        <Textarea
          placeholder="e.g., A tech reviewer looking shocked while holding the new iPhone, with glowing neon text 'INSANE!' in the background, cyberpunk aesthetic..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] text-base resize-none bg-muted/50 border-border/50 focus:border-primary"
        />
      </div>

      {/* Upload Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ImageUpload
          label="Extra Images"
          images={extraImages}
          onImagesChange={setExtraImages}
          maxImages={3}
        />
        <ImageUpload
          label="Inspiration"
          images={inspirationImage}
          onImagesChange={setInspirationImage}
          maxImages={1}
        />
        <ImageUpload
          label="Persons"
          images={personImages}
          onImagesChange={setPersonImages}
          maxImages={2}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            Count:
          </span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                onClick={() => setCount(num)}
                className={`
                  w-10 h-10 rounded-lg font-medium transition-all
                  ${
                    count === num
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  }
                `}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
          className="gap-2 min-w-[180px]"
        >
          <Wand2 className="w-5 h-5" />
          {isLoading ? "Generating..." : "Generate"}
        </Button>
      </div>

      {/* Results */}
      {(generatedImages.length > 0 || isLoading) && (
        <div className="pt-4 border-t border-border/50">
          <ThumbnailDisplay
            images={generatedImages}
            isLoading={isLoading}
            count={count}
            onRegenerate={
              generatedImages.length > 0 ? handleGenerate : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
