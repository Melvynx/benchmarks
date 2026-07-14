"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadZone } from "@/components/upload-zone";
import { ThumbnailCard } from "@/components/thumbnail-card";
import { UploadedFile } from "@/hooks/use-file-upload";

interface GeneratedThumbnail {
  id: string;
  base64: string;
  mimeType: string;
}

export default function Home() {
  const [faceImages, setFaceImages] = useState<UploadedFile[]>([]);
  const [inspirationImage, setInspirationImage] = useState<UploadedFile[]>([]);
  const [extraImages, setExtraImages] = useState<UploadedFile[]>([]);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnails, setThumbnails] = useState<GeneratedThumbnail[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceImages: faceImages.map((f) => f.base64!),
          inspirationImage: inspirationImage[0]?.base64,
          extraImages: extraImages.map((f) => f.base64!),
          prompt: prompt.trim(),
          count: parseInt(count),
        }),
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else {
        setThumbnails((prev) => [...result.thumbnails, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">YouTube Thumbnail Generator</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <UploadZone
                label="Face References"
                description="Upload face images"
                multiple
                maxFiles={4}
                files={faceImages}
                onFilesChange={setFaceImages}
              />
              <UploadZone
                label="Inspiration"
                description="Reference thumbnail"
                multiple={false}
                maxFiles={1}
                files={inspirationImage}
                onFilesChange={setInspirationImage}
              />
            </div>

            <UploadZone
              label="Extra Images"
              description="Additional context images"
              multiple
              maxFiles={4}
              files={extraImages}
              onFilesChange={setExtraImages}
            />

            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Describe your thumbnail... (e.g., 'A surprised expression looking at a laptop screen showing code, with bold text saying REACT IS DEAD?!')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label>Generate Count</Label>
                <Select value={count} onValueChange={setCount}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Thumbnails
                  </>
                )}
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Generated Thumbnails</h2>
              {thumbnails.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setThumbnails([])}
                >
                  Clear all
                </Button>
              )}
            </div>

            {thumbnails.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-12 text-center">
                <p className="text-muted-foreground">
                  Generated thumbnails will appear here
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {thumbnails.map((thumbnail) => (
                  <ThumbnailCard key={thumbnail.id} {...thumbnail} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
