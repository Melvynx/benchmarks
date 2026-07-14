"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/image-dropzone";
import { ThumbnailGrid } from "@/components/thumbnail-grid";

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
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          extraImages: extraImages.map((img) => img.split(",")[1]),
          inspirationImage: inspirationImage[0]?.split(",")[1] || null,
          personImages: personImages.map((img) => img.split(",")[1]),
          count,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (!data.images?.length) {
        toast.warning("No images were generated. Try a different prompt.");
        return;
      }

      setGeneratedImages(data.images);
      toast.success(`Generated ${data.images.length} thumbnail(s)`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Thumbnail Generator
          </h1>
          <p className="text-muted-foreground">
            Describe your YouTube thumbnail and let AI create it
          </p>
        </div>

        <div className="space-y-6">
          <Textarea
            placeholder="Describe your thumbnail... e.g. 'A shocked face looking at a massive code editor with the text NEVER DO THIS'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] resize-none text-base bg-card border-border"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImageDropzone
              label="Extra Images"
              description="Drop images to include"
              images={extraImages}
              onImagesChange={setExtraImages}
              multiple
            />
            <ImageDropzone
              label="Inspiration"
              description="Drop a style reference"
              images={inspirationImage}
              onImagesChange={setInspirationImage}
            />
            <ImageDropzone
              label="Persons"
              description="Drop photos of people"
              images={personImages}
              onImagesChange={setPersonImages}
              multiple
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex-1 space-y-2">
              <Label className="text-sm text-muted-foreground">
                Count: {count}
              </Label>
              <Slider
                value={[count]}
                onValueChange={(v) => setCount(v[0])}
                min={1}
                max={4}
                step={1}
              />
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
              className="min-w-[160px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        <ThumbnailGrid
          images={generatedImages}
          isLoading={isLoading}
          count={count}
        />
      </div>
    </div>
  );
}
