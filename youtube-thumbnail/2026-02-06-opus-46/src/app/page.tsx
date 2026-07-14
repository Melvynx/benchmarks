"use client";

import { useState } from "react";
import { ImagePlus, Sparkles, User, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ImageDropzone } from "@/components/image-dropzone";
import { ThumbnailGrid } from "@/components/thumbnail-grid";

function extractBase64(dataUrl: string): string {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : dataUrl;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspiration, setInspiration] = useState<string[]>([]);
  const [persons, setPersons] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ data: string; mediaType: string }>
  >([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    setGeneratedImages([]);

    try {
      const allImages = [
        ...extraImages,
        ...inspiration,
        ...persons,
      ].map(extractBase64);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          images: allImages,
          count,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.images?.length > 0) {
        setGeneratedImages(data.images);
        toast.success(`Generated ${data.images.length} thumbnail(s)`);
      } else {
        toast.warning("No images were generated. Try a different prompt.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Thumbfast by Opus 4.6
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate YouTube thumbnails with AI
          </p>
        </header>

        <div className="flex flex-col gap-6">
          <Textarea
            placeholder="Describe your thumbnail... e.g. 'A shocked face looking at a giant pile of money with text saying YOU WON'T BELIEVE THIS'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none rounded-xl border-border bg-muted/30 text-base placeholder:text-muted-foreground/50 focus-visible:ring-primary"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ImageDropzone
              label="Extra Images"
              description="Drop reference images"
              images={extraImages}
              onImagesChange={setExtraImages}
              multiple
              icon={<ImagePlus className="h-6 w-6" />}
            />
            <ImageDropzone
              label="Inspiration"
              description="Drop a style reference"
              images={inspiration}
              onImagesChange={setInspiration}
              multiple={false}
              icon={<Sparkles className="h-6 w-6" />}
            />
            <ImageDropzone
              label="Persons"
              description="Drop photos of people"
              images={persons}
              onImagesChange={setPersons}
              multiple
              icon={<User className="h-6 w-6" />}
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Count
              </label>
              <Slider
                value={[count]}
                onValueChange={([v]) => setCount(v)}
                min={1}
                max={4}
                step={1}
                className="w-32"
              />
              <span className="w-4 text-sm font-medium">{count}</span>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              size="lg"
              className="gap-2 rounded-xl"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {loading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        <ThumbnailGrid
          images={generatedImages}
          loading={loading}
          count={count}
        />
      </div>
    </div>
  );
}
