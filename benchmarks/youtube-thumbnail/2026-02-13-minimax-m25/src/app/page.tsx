"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { ThumbnailCard } from "@/components/ThumbnailCard";
import { toast } from "sonner";

interface GeneratedImage {
  data: string;
  mediaType: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [personsImages, setPersonsImages] = useState<string[]>([]);
  const [count, setCount] = useState([1]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [thumbnails, setThumbnails] = useState<GeneratedImage[]>([]);

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setThumbnails([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images: [...extraImages, ...inspirationImage, ...personsImages],
          count: count[0],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setThumbnails(data.images);
      toast.success("Thumbnails generated successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate thumbnails"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            MiniMax 2.5
          </h1>
          <p className="text-muted-foreground">
            Create stunning thumbnails with AI
          </p>
        </div>

        <div className="space-y-6">
          <Input
            placeholder="Describe your thumbnail..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-14 text-lg bg-card border-border"
          />

          <div className="grid md:grid-cols-3 gap-4">
            <ImageUpload
              label="Extra Images"
              images={extraImages}
              onChange={setExtraImages}
              maxFiles={4}
            />
            <ImageUpload
              label="Inspiration"
              images={inspirationImage}
              onChange={(imgs) => setInspirationImage(imgs.slice(0, 1))}
              maxFiles={1}
            />
            <ImageUpload
              label="Persons"
              images={personsImages}
              onChange={setPersonsImages}
              maxFiles={4}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
            <div className="flex items-center gap-4">
              <Label className="text-muted-foreground">Count:</Label>
              <div className="w-48">
                <Slider
                  value={count}
                  onValueChange={setCount}
                  min={1}
                  max={4}
                  step={1}
                />
              </div>
              <span className="text-lg font-medium w-8">{count[0]}</span>
            </div>
            <Button
              onClick={generate}
              disabled={isGenerating}
              size="lg"
              className="min-w-40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {isGenerating && (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(count[0])].map((_, i) => (
              <div
                key={i}
                className="aspect-video bg-card rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {thumbnails.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {thumbnails.map((thumbnail, index) => (
              <ThumbnailCard key={index} image={thumbnail} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
