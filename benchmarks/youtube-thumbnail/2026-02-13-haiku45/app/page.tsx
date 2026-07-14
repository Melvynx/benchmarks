"use client";

import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadZone } from "./components/ImageUploadZone";
import { Toaster, toast } from "sonner";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [personImages, setPersonImages] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<
    { data: string; mediaType: string }[]
  >([]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const allImages = [
        ...extraImages,
        ...inspirationImage,
        ...personImages,
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
        throw new Error(error.error || "Generation failed");
      }

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        toast.success(`Generated ${data.images.length} thumbnails`);
      } else {
        toast.info("Thumbnails generated successfully");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to generate thumbnails"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = (image: { data: string; mediaType: string }) => {
    const link = document.createElement("a");
    link.href = image.data;
    link.download = `thumbnail-${Date.now()}.${image.mediaType.split("/")[1]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            YouTube Thumbnail Generator
          </h1>
          <p className="text-muted-foreground">
            Create eye-catching YouTube thumbnails powered by AI
          </p>
        </div>

        <div className="space-y-6">
          {/* Prompt Input */}
          <Card className="p-6 border-muted">
            <label className="block text-sm font-medium mb-2 text-foreground">
              Describe your thumbnail
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., A shocked face with a bright red background, bold typography saying 'INSANE', trending style"
              className="min-h-24 bg-muted/50 border-muted-foreground/30 text-foreground placeholder:text-muted-foreground/50"
            />
          </Card>

          {/* Upload Zones */}
          <Card className="p-6 border-muted">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ImageUploadZone
                label="Extra Images"
                onImagesSelected={setExtraImages}
                maxImages={3}
                isMultiple={true}
                previewImages={extraImages}
              />
              <ImageUploadZone
                label="Inspiration"
                onImagesSelected={setInspirationImage}
                maxImages={1}
                isMultiple={false}
                previewImages={inspirationImage}
              />
              <ImageUploadZone
                label="Persons"
                onImagesSelected={setPersonImages}
                maxImages={3}
                isMultiple={true}
                previewImages={personImages}
              />
            </div>
          </Card>

          {/* Controls */}
          <Card className="p-6 border-muted">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2 text-foreground">
                  Number of variations
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => setCount(num)}
                      className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all ${
                        count === num
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-muted-foreground/20"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Thumbnails"
                )}
              </Button>
            </div>
          </Card>

          {/* Generated Thumbnails */}
          {generatedImages.length > 0 && (
            <Card className="p-6 border-muted">
              <h2 className="text-2xl font-bold mb-4 text-foreground">
                Generated Thumbnails
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((image, idx) => (
                  <div key={idx} className="group relative">
                    <img
                      src={image.data}
                      alt={`generated-${idx}`}
                      className="w-full rounded-lg border border-muted-foreground/20"
                    />
                    <button
                      onClick={() => downloadImage(image)}
                      className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
