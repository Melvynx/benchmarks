"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, Loader2, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUploader } from "@/components/image-uploader";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [personsImages, setPersonsImages] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    const toastId = toast.loading(`Generating ${count} thumbnail${count > 1 ? 's' : ''}...`);

    try {
      const allImages = [
        ...extraImages,
        ...inspirationImage,
        ...personsImages,
      ];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images: allImages,
          count,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
      }

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        toast.success("Generation complete!", { id: toastId });
      } else {
        throw new Error("No images were generated");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong", {
        id: toastId,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `thumbnail-${index + 1}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 flex flex-col gap-8">
        {/* Header */}
        <header className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-zinc-900 rounded-2xl mb-4 border border-zinc-800">
            <ImageIcon className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Thumbnail Generator
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto text-lg">
            Create high-quality, photorealistic YouTube thumbnails using Midjourney-style prompting.
          </p>
        </header>

        {/* Main Input */}
        <div className="space-y-6 bg-zinc-900/50 p-6 md:p-8 rounded-3xl border border-zinc-800/50 shadow-2xl backdrop-blur-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400 px-1">
              Your Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A futuristic cyber city at neon sunset, cinematic lighting, highly detailed..."
              className="w-full min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-y transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4 border border-zinc-800/80 p-4 rounded-2xl bg-zinc-950/50">
              <ImageUploader
                label="Extra Images"
                maxFiles={4}
                value={extraImages}
                onChange={setExtraImages}
              />
            </div>

            <div className="space-y-4 border border-zinc-800/80 p-4 rounded-2xl bg-zinc-950/50">
              <ImageUploader
                label="Style Inspiration"
                maxFiles={1}
                value={inspirationImage}
                onChange={setInspirationImage}
              />
            </div>

            <div className="space-y-4 border border-zinc-800/80 p-4 rounded-2xl bg-zinc-950/50">
              <ImageUploader
                label="Persons / Faces"
                maxFiles={2}
                value={personsImages}
                onChange={setPersonsImages}
              />
            </div>
          </div>

          {/* Controls & Generate */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800/50">
            <div className="flex items-center gap-4 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
              <span className="text-sm text-zinc-400 font-medium">Variations</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCount((c) => Math.max(1, c - 1))}
                  className="p-1 hover:text-white text-zinc-500 disabled:opacity-50 transition-colors"
                  disabled={count <= 1 || isGenerating}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-4 text-center font-semibold">{count}</span>
                <button
                  onClick={() => setCount((c) => Math.min(4, c + 1))}
                  className="p-1 hover:text-white text-zinc-500 disabled:opacity-50 transition-colors"
                  disabled={count >= 4 || isGenerating}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full sm:w-auto h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-8 font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Thumbnail"
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        {(generatedImages.length > 0 || isGenerating) && (
          <div className="space-y-6 pt-8 border-t border-zinc-800">
            <h2 className="text-2xl font-semibold text-white">Results</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {isGenerating
                ? Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="w-full aspect-video rounded-2xl bg-zinc-900 border border-zinc-800" />
                      <div className="flex justify-between items-center px-1">
                        <Skeleton className="h-4 w-24 bg-zinc-900" />
                        <Skeleton className="h-8 w-8 rounded-full bg-zinc-900" />
                      </div>
                    </div>
                  ))
                : generatedImages.map((img, i) => (
                    <div key={i} className="group space-y-3">
                      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-xl transition-transform hover:scale-[1.02]">
                        <Image
                          src={img}
                          alt={`Generated thumbnail ${i + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-sm text-zinc-500 font-medium">Generation {i + 1}</span>
                        <button
                          onClick={() => handleDownload(img, i)}
                          className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors border border-zinc-800"
                          title="Download Image"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>
    </main>
  );
}