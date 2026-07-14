"use client";

import * as React from "react";
import {
  User,
  Sparkles,
  Images,
  Wand2,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/image-upload";
import { generateThumbnail } from "@/app/actions";

export function ThumbnailGenerator() {
  const [faceImages, setFaceImages] = React.useState<string[]>([]);
  const [inspirationImage, setInspirationImage] = React.useState<string[]>([]);
  const [extraImages, setExtraImages] = React.useState<string[]>([]);
  const [prompt, setPrompt] = React.useState("");
  const [generatedImage, setGeneratedImage] = React.useState<string | null>(
    null
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateThumbnail({
        faceImages,
        inspirationImage: inspirationImage[0] || null,
        extraImages,
        prompt,
      });

      if (result.success && result.image) {
        setGeneratedImage(result.image);
      } else {
        setError(result.error || "Failed to generate thumbnail");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `thumbnail-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canGenerate = prompt.trim().length > 0 || faceImages.length > 0;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Input Section */}
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-6 space-y-6">
            {/* Face Upload */}
            <ImageUpload
              label="Your Face"
              description="Upload photos of yourself for the thumbnail"
              multiple={true}
              images={faceImages}
              onImagesChange={setFaceImages}
              icon={
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-4 h-4 text-primary" />
                </div>
              }
            />

            <Separator className="bg-border/50" />

            {/* Inspiration Upload */}
            <ImageUpload
              label="Inspiration"
              description="Upload a thumbnail style you want to match"
              multiple={false}
              images={inspirationImage}
              onImagesChange={setInspirationImage}
              icon={
                <div className="p-2 rounded-lg bg-chart-2/10">
                  <Sparkles className="w-4 h-4 text-chart-2" />
                </div>
              }
            />

            <Separator className="bg-border/50" />

            {/* Extra Images */}
            <ImageUpload
              label="Extra Images"
              description="Additional reference images or elements to include"
              multiple={true}
              images={extraImages}
              onImagesChange={setExtraImages}
              icon={
                <div className="p-2 rounded-lg bg-chart-3/10">
                  <Images className="w-4 h-4 text-chart-3" />
                </div>
              }
            />

            <Separator className="bg-border/50" />

            {/* Prompt Input */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-chart-5/10">
                  <Wand2 className="w-4 h-4 text-chart-5" />
                </div>
                <div>
                  <Label htmlFor="prompt" className="font-semibold text-sm">
                    Prompt
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Describe your ideal thumbnail
                  </p>
                </div>
              </div>
              <Textarea
                id="prompt"
                placeholder="E.g., Shocked face looking at money raining down, with bold text saying 'I MADE $10K', bright yellow and red colors, high energy..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none bg-muted/30 border-border/50 focus:border-primary/50"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isLoading}
              className="w-full h-12 text-base font-semibold glow-effect-subtle hover:glow-effect transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generate Thumbnail
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Output Section */}
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Generated Thumbnail</h3>
                <p className="text-xs text-muted-foreground">
                  16:9 aspect ratio (1280×720)
                </p>
              </div>
              {generatedImage && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerate}
                    disabled={isLoading || !canGenerate}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Regenerate
                  </Button>
                  <Button size="sm" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              )}
            </div>

            {/* Thumbnail Preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/30 border border-border/50">
              {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Creating your thumbnail...
                  </p>
                </div>
              ) : generatedImage ? (
                <img
                  src={generatedImage}
                  alt="Generated thumbnail"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Images className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">No thumbnail yet</p>
                    <p className="text-xs">
                      Upload images and describe your thumbnail to get started
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-destructive">
                    Generation Failed
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-chart-2/5">
          <CardContent className="p-5">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Pro Tips
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Use clear, well-lit face photos for best results
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Reference popular thumbnails from your niche
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Be specific in your prompt about colors, emotions, and text
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Include action words and emotional expressions
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

