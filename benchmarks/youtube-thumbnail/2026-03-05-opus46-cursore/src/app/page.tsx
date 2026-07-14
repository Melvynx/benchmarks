"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageDropzone } from "@/components/image-dropzone";
import { ThumbnailGrid } from "@/components/thumbnail-grid";

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

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
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

      if (!data.images?.length) {
        toast.warning("No images were generated. Try a different prompt.");
        return;
      }

      setResults(data.images);
      toast.success(`Generated ${data.images.length} thumbnail(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Thumbnail Generator
        </h1>
        <p className="text-sm text-muted-foreground">
          Describe your YouTube thumbnail and let AI create it.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <Textarea
          placeholder="A tech review thumbnail with bold text 'IS IT WORTH IT?' and a MacBook Pro floating on a gradient background..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[120px] resize-none rounded-xl border-border/50 bg-accent/20 text-base placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-ring/30"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Count</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCount((c) => Math.max(1, c - 1))}
                disabled={count <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">
                {count}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCount((c) => Math.min(4, c + 1))}
                disabled={count >= 4}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="gap-2 px-6"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      <ThumbnailGrid images={results} loading={loading} count={count} />
    </div>
  );
}
