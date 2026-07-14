"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUploadZone } from "@/components/image-upload-zone";
import { Download, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const allImages = [...extraImages, ...inspirationImage, ...personImages];

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          images: allImages,
          count,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        toast.success(`Generated ${data.images.length} thumbnail(s)`);
      } else {
        toast.error("No images were generated");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (image: GeneratedImage, index: number) => {
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Image downloaded");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            YouTube Thumbnail Generator
          </h1>
          <p className="text-muted-foreground">
            Create stunning thumbnails with AI
          </p>
        </header>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Describe your thumbnail</label>
            <Textarea
              placeholder="A dramatic YouTube thumbnail showing a person surprised at their computer screen, with bold text overlay saying 'I MADE $10,000' and money flying in the background..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] bg-card border-border resize-none text-base"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImageUploadZone
              title="Extra Images"
              description="Drag & drop or click to add background/overlay images"
              images={extraImages}
              onImagesChange={setExtraImages}
              multiple
            />
            <ImageUploadZone
              title="Inspiration"
              description="Drag & drop a reference thumbnail style"
              images={inspirationImage}
              onImagesChange={setInspirationImage}
              multiple={false}
            />
            <ImageUploadZone
              title="Persons"
              description="Drag & drop faces to include in the thumbnail"
              images={personImages}
              onImagesChange={setPersonImages}
              multiple
            />
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
            <div className="flex-1 space-y-2 w-full sm:w-auto">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
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
                className="w-full sm:w-48"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              size="lg"
              className="w-full sm:w-auto px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>

          {(isGenerating || generatedImages.length > 0) && (
            <div className="pt-8 border-t border-border">
              <h2 className="text-lg font-semibold mb-4">Generated Thumbnails</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isGenerating
                  ? Array.from({ length: count }).map((_, i) => (
                      <div key={i} className="aspect-video rounded-lg overflow-hidden">
                        <Skeleton className="w-full h-full" />
                      </div>
                    ))
                  : generatedImages.map((image, index) => (
                      <div
                        key={index}
                        className="relative group aspect-video rounded-lg overflow-hidden bg-card border border-border"
                      >
                        <img
                          src={`data:${image.mediaType};base64,${image.data}`}
                          alt={`Generated thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => downloadImage(image, index)}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
