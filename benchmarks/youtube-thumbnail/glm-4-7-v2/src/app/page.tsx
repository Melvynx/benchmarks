"use client";

import { useState } from "react";
import { Download, Image as ImageIcon, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";

interface GeneratedImage {
  data: string;
  mediaType: string;
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspiration, setInspiration] = useState<string[]>([]);
  const [persons, setPersons] = useState<string[]>([]);
  const [count, setCount] = useState([1]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const allImages = [...extraImages, ...inspiration, ...persons];
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, images: allImages }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate");
      }

      const data = await response.json();
      setGeneratedImages(data.images);
      toast.success(`Generated ${data.images.length} thumbnail(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate thumbnails");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (image: GeneratedImage, index: number) => {
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.png`;
    link.click();
    toast.success("Download started");
  };

  const hasImages = extraImages.length > 0 || inspiration.length > 0 || persons.length > 0;

  return (
    <div className="min-h-screen bg-black font-sans">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-zinc-400" />
            <h1 className="text-2xl font-semibold text-white">YouTube Thumbnail Generator</h1>
          </div>
          <p className="text-zinc-500">Create stunning thumbnails with AI</p>
        </header>

        <div className="space-y-6 mb-8">
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your thumbnail..."
              className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          {hasImages && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {extraImages.length > 0 && (
                <ImageUpload images={extraImages} onImagesChange={setExtraImages} label="Extra Images" maxImages={4} />
              )}
              {inspiration.length > 0 && (
                <ImageUpload images={inspiration} onImagesChange={setInspiration} label="Inspiration" maxImages={1} />
              )}
              {persons.length > 0 && (
                <ImageUpload images={persons} onImagesChange={setPersons} label="Persons" maxImages={4} />
              )}
            </div>
          )}

          {!hasImages && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ImageUpload images={extraImages} onImagesChange={setExtraImages} label="Extra Images" maxImages={4} />
              <ImageUpload images={inspiration} onImagesChange={setInspiration} label="Inspiration" maxImages={1} />
              <ImageUpload images={persons} onImagesChange={setPersons} label="Persons" maxImages={4} />
            </div>
          )}

          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <label className="text-sm font-medium text-zinc-400 mb-2 block">
                Count: {count[0]}
              </label>
              <Slider value={count} onValueChange={setCount} min={1} max={4} step={1} className="w-full" />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="h-12 px-8 bg-white text-black hover:bg-zinc-200 rounded-full"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        {generatedImages.length > 0 && (
          <div>
            <h2 className="text-lg font-medium text-white mb-4">Generated Thumbnails</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {generatedImages.map((image, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={`data:${image.mediaType};base64,${image.data}`}
                    alt={`Generated thumbnail ${idx + 1}`}
                    className="w-full aspect-video object-cover rounded-lg"
                  />
                  <button
                    onClick={() => downloadImage(image, idx)}
                    className="absolute bottom-2 right-2 p-2 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: count[0] }).map((_, idx) => (
              <div key={idx} className="aspect-video bg-zinc-900 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
