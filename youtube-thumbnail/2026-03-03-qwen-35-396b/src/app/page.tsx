"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/image-upload";
import { ThumbnailGrid } from "@/components/thumbnail-grid";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [personImages, setPersonImages] = useState<string[]>([]);
  const [count, setCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<{ data: string; mediaType: string }[]>([]);

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
          count: parseInt(count),
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedImages(data.images || []);
      toast.success("Thumbnail generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate thumbnail");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto">
      <ThemeToggle />
      <Toaster />

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">YouTube Thumbnail Generator</h1>
        <p className="text-muted-foreground">
          Create stunning thumbnails with AI-powered image generation
        </p>
      </div>

      {/* Prompt Input */}
      <Card className="mb-6 border-border/50">
        <CardContent className="p-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input
              id="prompt"
              placeholder="Describe your thumbnail..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px] font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Image Upload Zones */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ImageUpload
          title="Extra Images"
          description="Multi-upload reference images"
          acceptMultiple={true}
          images={extraImages}
          setImages={setExtraImages}
          maxImages={5}
        />

        <ImageUpload
          title="Inspiration"
          description="Single style reference"
          acceptMultiple={false}
          images={inspirationImage}
          setImages={setInspirationImage}
        />

        <ImageUpload
          title="Persons"
          description="Multi-upload person photos"
          acceptMultiple={true}
          images={personImages}
          setImages={setPersonImages}
          maxImages={3}
        />
      </div>

      {/* Count and Generate Button */}
      <Card className="mb-6 border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2 w-48">
              <Label htmlFor="count">Count</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select count" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex-1 bg-primary hover:bg-primary/90"
              size="lg"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Thumbnails */}
      {isGenerating && <LoadingSkeleton />}
      {!isGenerating && generatedImages.length > 0 && (
        <ThumbnailGrid images={generatedImages} />
      )}
    </div>
  );
}
