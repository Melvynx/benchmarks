"use client";

import * as React from "react";
import {
  Download,
  ImageIcon,
  LoaderCircle,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { UploadZone, type UploadItem } from "@/components/upload-zone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type GeneratedImage = {
  data: string;
  mediaType: string;
};

export function ThumbnailStudio() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [count, setCount] = React.useState("1");
  const [extraImages, setExtraImages] = React.useState<UploadItem[]>([]);
  const [inspiration, setInspiration] = React.useState<UploadItem[]>([]);
  const [persons, setPersons] = React.useState<UploadItem[]>([]);
  const [generatedImages, setGeneratedImages] = React.useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  async function generate() {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      toast.error("Describe the thumbnail you want to create.");
      return;
    }

    setIsGenerating(true);
    setGeneratedImages([]);

    try {
      const images = [...extraImages, ...inspiration, ...persons].map(
        (image) => image.dataUrl,
      );
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          images,
          count: Number(count),
          referenceCounts: {
            extra: extraImages.length,
            inspiration: inspiration.length,
            persons: persons.length,
          },
        }),
      });

      const payload = (await response.json()) as {
        images?: GeneratedImage[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Generation failed. Please try again.");
      }
      if (!payload.images?.length) {
        throw new Error("Gemini returned no images. Try a more detailed prompt.");
      }

      setGeneratedImages(payload.images);
      toast.success(
        `${payload.images.length} thumbnail${payload.images.length > 1 ? "s" : ""} generated.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generation failed. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function downloadImage(image: GeneratedImage, index: number) {
    const anchor = document.createElement("a");
    const extension = image.mediaType.split("/")[1]?.replace("jpeg", "jpg") || "png";
    anchor.href = `data:${image.mediaType};base64,${image.data}`;
    anchor.download = `youtube-thumbnail-${index + 1}.${extension}`;
    anchor.click();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">gpt-5.6-sol</h1>
            <p className="text-xs text-muted-foreground">Thumbnail studio</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle color theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {mounted && resolvedTheme === "dark" ? (
            <Sun aria-hidden="true" />
          ) : (
            <Moon aria-hidden="true" />
          )}
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="p-5 sm:p-7">
            <label htmlFor="thumbnail-prompt" className="sr-only">
              Thumbnail prompt
            </label>
            <Textarea
              id="thumbnail-prompt"
              variant="composer"
              value={prompt}
              maxLength={1200}
              placeholder="Describe the thumbnail — subject, setting, mood, headline, camera angle…"
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void generate();
                }
              }}
            />
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                Add references below to guide composition, style, and likeness.
              </p>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {prompt.length}/1200
              </span>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-3">
            <UploadZone
              kind="extra"
              title="Extra images"
              description="Objects, logos, or visual elements"
              files={extraImages}
              onFilesChange={setExtraImages}
              multiple
              maxFiles={4}
            />
            <UploadZone
              kind="inspiration"
              title="Inspiration"
              description="One reference for style and layout"
              files={inspiration}
              onFilesChange={setInspiration}
            />
            <UploadZone
              kind="persons"
              title="Persons"
              description="Faces and likeness references"
              files={persons}
              onFilesChange={setPersons}
              multiple
              maxFiles={4}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-center justify-between gap-4 sm:justify-start">
              <span id="count-label" className="text-sm font-medium">
                Count
              </span>
              <ToggleGroup
                value={count}
                onValueChange={setCount}
                aria-labelledby="count-label"
              >
                {["1", "2", "3", "4"].map((option) => (
                  <ToggleGroupItem key={option} value={option}>
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <Button
              size="lg"
              disabled={isGenerating || !prompt.trim()}
              className="w-full sm:w-auto"
              onClick={() => void generate()}
            >
              {isGenerating ? (
                <LoaderCircle className="animate-spin" data-icon="inline-start" />
              ) : (
                <Sparkles data-icon="inline-start" />
              )}
              {isGenerating ? "Generating…" : "Generate thumbnails"}
            </Button>
          </div>
        </section>

        <section aria-labelledby="results-heading" className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="results-heading" className="text-base font-semibold">
                Generated thumbnails
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your latest 16:9 concepts appear here.
              </p>
            </div>
            <Badge variant="secondary">16:9</Badge>
          </div>

          {isGenerating ? (
            <div
              className="grid gap-5 md:grid-cols-2"
              aria-label={`Generating ${count} thumbnails`}
            >
              {Array.from({ length: Number(count) }, (_, index) => (
                <div key={index} className="flex flex-col gap-3">
                  <Skeleton className="aspect-video w-full" />
                  <div className="flex items-center justify-between gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="size-9" />
                  </div>
                </div>
              ))}
            </div>
          ) : generatedImages.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {generatedImages.map((image, index) => (
                <article key={`${image.data.slice(0, 24)}-${index}`} className="group">
                  <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted shadow-sm">
                    {/* Generated base64 images are not remote assets. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${image.mediaType};base64,${image.data}`}
                      alt={`Generated YouTube thumbnail ${index + 1}`}
                      className="size-full object-cover"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={`Download thumbnail ${index + 1}`}
                      className="absolute bottom-3 right-3 shadow-sm"
                      onClick={() => downloadImage(image, index)}
                    >
                      <Download aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 px-1">
                    <p className="text-sm font-medium">Concept {index + 1}</p>
                    <span className="text-xs text-muted-foreground">
                      {image.mediaType.replace("image/", "").toUpperCase()}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <ImageIcon className="size-5" aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Your canvas is ready</EmptyTitle>
                <EmptyDescription>
                  Write a visual direction, optionally add reference images, and
                  generate up to four thumbnail concepts.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </main>
    </div>
  );
}
