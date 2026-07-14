"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ImageDropzone } from "@/components/image-dropzone";
import { ThumbnailGrid } from "@/components/thumbnail-grid";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);

  const allImages = [...extraImages, ...inspiration, ...persons];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const allResults: GeneratedImage[] = [];

      for (let i = 0; i < count; i++) {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, images: allImages }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Generation failed");
        }

        allResults.push(...data.images);
        setResults([...allResults]);
      }

      toast.success(`Generated ${allResults.length} thumbnail(s)`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Thumbnail Generator
        </h1>
        <p className="mt-2 text-muted-foreground">
          Generate YouTube thumbnails with AI
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your YouTube thumbnail... e.g. 'A shocked developer looking at code with fire in the background, bold text saying WOW'"
          className="min-h-[120px] w-full resize-none rounded-xl border border-border bg-card p-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ImageDropzone
            label="Extra Images"
            description="Additional context images"
            images={extraImages}
            onImagesChange={setExtraImages}
            multiple
            maxFiles={4}
          />
          <ImageDropzone
            label="Inspiration"
            description="Style reference image"
            images={inspiration}
            onImagesChange={setInspiration}
          />
          <ImageDropzone
            label="Persons"
            description="People to include"
            images={persons}
            onImagesChange={setPersons}
            multiple
            maxFiles={4}
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-1 items-center gap-4">
            <label className="shrink-0 text-sm font-medium">
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

      <ThumbnailGrid images={results} loading={loading} count={count} />
    </div>
  );
}
