"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Download, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageDropzone } from "@/components/image-dropzone";

interface GeneratedImage {
  data: string;
  mediaType: string;
}

function SkeletonThumbnail() {
  return (
    <div className="aspect-video w-full rounded-lg bg-muted animate-pulse" />
  );
}

function ThumbnailCard({ image }: { image: GeneratedImage }) {
  const src = `data:${image.mediaType};base64,${image.data}`;

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `thumbnail-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="group relative rounded-lg overflow-hidden bg-card border border-border">
      <img
        src={src}
        alt="Generated thumbnail"
        className="w-full aspect-video object-cover"
      />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button size="sm" variant="secondary" onClick={download}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [inspirationImages, setInspirationImages] = useState<string[]>([]);
  const [personImages, setPersonImages] = useState<string[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);

  const handleExtraImages = useCallback(
    (imgs: string[]) => setExtraImages(imgs),
    []
  );
  const handleInspirationImages = useCallback(
    (imgs: string[]) => setInspirationImages(imgs),
    []
  );
  const handlePersonImages = useCallback(
    (imgs: string[]) => setPersonImages(imgs),
    []
  );

  const generate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    setLoading(true);
    setGeneratedImages([]);

    const allImages = [...extraImages, ...inspirationImages, ...personImages];

    try {
      const calls = Array.from({ length: count }, () =>
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, images: allImages }),
        }).then((r) => r.json())
      );

      const results = await Promise.all(calls);
      const images: GeneratedImage[] = results.flatMap((r) => r.images ?? []);

      if (images.length === 0) {
        toast.error("No images were generated. Try a different prompt.");
      } else {
        setGeneratedImages(images);
      }
    } catch {
      toast.error("Generation failed. Check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Claude Code - Claude Sonnet 4.6
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate YouTube thumbnails with AI
          </p>
        </div>

        <div className="flex flex-col gap-4 bg-card border border-border rounded-xl p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your thumbnail… e.g. 'A shocked man holding a $1000 iPhone with lightning in the background'"
            className="w-full min-h-[80px] bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
            }}
          />

          <div className="h-px bg-border" />

          <div className="grid grid-cols-3 gap-4">
            <ImageDropzone
              label="Extra Images"
              multiple
              onChange={handleExtraImages}
            />
            <ImageDropzone
              label="Inspiration"
              multiple={false}
              onChange={handleInspirationImages}
            />
            <ImageDropzone
              label="Persons"
              multiple
              onChange={handlePersonImages}
            />
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Count:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                      count === n
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {loading ? "Generating…" : "Generate"}
            </Button>
          </div>
        </div>

        {(loading || generatedImages.length > 0) && (
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Generated Thumbnails
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {loading
                ? Array.from({ length: count }).map((_, i) => (
                    <SkeletonThumbnail key={i} />
                  ))
                : generatedImages.map((img, i) => (
                    <ThumbnailCard key={i} image={img} />
                  ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
