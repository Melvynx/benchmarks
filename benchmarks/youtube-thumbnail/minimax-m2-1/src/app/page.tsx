"use client";

import { useState } from "react";
import { Sparkles, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { UploadZone } from "@/components/upload-zone";
import { ThumbnailGrid } from "@/components/thumbnail-grid";
import { toast } from "sonner";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(4);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string | null>(null);
  const [personsImages, setPersonsImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ data: string; mediaType: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    setGeneratedImages([]);

    try {
      const images = [
        ...extraImages,
        ...(inspirationImage ? [inspirationImage] : []),
        ...personsImages,
      ];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, images, count }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Generation failed");
      }

      const data = await response.json();
      setGeneratedImages(data.images);
      toast.success("Thumbnails generated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate thumbnails"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            YouTube Thumbnail Generator
          </h1>
          <p className="text-muted-foreground mt-2">
            Create stunning thumbnails with AI
          </p>
        </header>

        <main className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="Describe your thumbnail..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <UploadZone
              label="Extra Images (Reference)"
              onImagesSelected={(files) =>
                setExtraImages((prev) => [...prev, ...files])
              }
              maxFiles={3}
            />
            <UploadZone
              label="Inspiration (Style Reference)"
              onImagesSelected={(files) =>
                setInspirationImage(files[0] || null)
              }
              maxFiles={1}
            />
            <UploadZone
              label="Persons (Include in thumbnail)"
              onImagesSelected={(files) =>
                setPersonsImages((prev) => [...prev, ...files])
              }
              maxFiles={2}
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <Label>Count: {count}</Label>
              <Slider
                value={[count]}
                onValueChange={([v]) => setCount(v)}
                min={1}
                max={4}
                step={1}
                className="w-32"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="ml-auto"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </div>

          <section>
            <ThumbnailGrid
              images={generatedImages}
              isLoading={isLoading}
              onRegenerate={handleGenerate}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
