"use client";

import { generateThumbnails } from "@/app/actions";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Download, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useState } from "react";

export function ThumbnailGenerator() {
  const [faceImages, setFaceImages] = useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = useState<string[]>([]);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [count, setCount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please provide a prompt describing your thumbnail");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedIndex(0);

    const result = await generateThumbnails({
      faceImages,
      inspirationImage: inspirationImage[0] || null,
      extraImages,
      prompt,
      count: parseInt(count),
    });

    setIsLoading(false);

    if (result.success) {
      setGeneratedImages(result.images);
    } else {
      setError(result.error);
    }
  };

  const handleDownload = (index: number) => {
    const image = generatedImages[index];
    if (!image) return;

    const link = document.createElement("a");
    link.href = image;
    link.download = `thumbnail-${Date.now()}-${index + 1}.png`;
    link.click();
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((_, index) => {
      setTimeout(() => handleDownload(index), index * 200);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5" />
              Input References
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* nimporte ou */}
            <ImageUpload
              label="Face References"
              description="Upload photos of faces to include in the thumbnail"
              multiple
              maxImages={3}
              images={faceImages}
              onImagesChange={setFaceImages}
            />

            <ImageUpload
              label="Inspiration Thumbnail"
              description="Upload a thumbnail style you want to match"
              images={inspirationImage}
              onImagesChange={setInspirationImage}
            />

            <ImageUpload
              label="Extra Images"
              description="Additional reference images (products, backgrounds, etc.)"
              multiple
              maxImages={4}
              images={extraImages}
              onImagesChange={setExtraImages}
            />

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe your thumbnail: e.g., 'Create a dramatic thumbnail with my face showing shock, bold red text saying WOW, dark background with glowing effects'"
                className="min-h-[100px] resize-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Number of thumbnails</Label>
              <ToggleGroup
                type="single"
                value={count}
                onValueChange={(value) => value && setCount(value)}
                className="justify-start"
              >
                {["1", "2", "3", "4"].map((num) => (
                  <ToggleGroupItem
                    key={num}
                    value={num}
                    className="w-12 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {num}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
              {generatedImages.length > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Generated Thumbnail
                {generatedImages.length > 1 && (
                  <span className="text-muted-foreground font-normal ml-2">
                    ({selectedIndex + 1}/{generatedImages.length})
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {generatedImages.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadAll}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    All
                  </Button>
                )}
                {generatedImages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(selectedIndex)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video overflow-hidden rounded-lg bg-muted">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Creating {count} thumbnail{parseInt(count) > 1 ? "s" : ""}
                      ...
                    </p>
                  </div>
                </div>
              ) : generatedImages.length > 0 ? (
                <img
                  src={generatedImages[selectedIndex]}
                  alt={`Generated thumbnail ${selectedIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="rounded-full bg-muted-foreground/10 p-4 mx-auto w-fit">
                      <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your generated thumbnail will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>

            {generatedImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {generatedImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`aspect-video rounded-md overflow-hidden border-2 transition-all ${
                      selectedIndex === index
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium text-sm mb-2">Tips for better results:</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Use high-quality face photos with good lighting</li>
            <li>• Reference thumbnails from successful YouTubers</li>
            <li>• Be specific about colors, text, and emotions</li>
            <li>• Generate multiple variations to find the best one</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
