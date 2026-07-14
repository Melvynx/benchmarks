"use client";

import * as React from "react";
import {
  ImagePlus,
  Images,
  LoaderCircle,
  Sparkles,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { ResultsSkeleton } from "@/components/results-skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  type GeneratedThumbnail,
  ThumbnailResultCard,
} from "@/components/thumbnail-result-card";
import {
  type UploadAsset,
  UploadDropzone,
} from "@/components/upload-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type UploadBucket = "extra" | "inspiration" | "persons";
type GenerationCount = 1 | 2 | 3 | 4;

const countOptions: GenerationCount[] = [1, 2, 3, 4];

export function ThumbnailGenerator() {
  const [prompt, setPrompt] = React.useState("");
  const [count, setCount] = React.useState<GenerationCount>(1);
  const [extraImages, setExtraImages] = React.useState<UploadAsset[]>([]);
  const [inspiration, setInspiration] = React.useState<UploadAsset[]>([]);
  const [persons, setPersons] = React.useState<UploadAsset[]>([]);
  const [results, setResults] = React.useState<GeneratedThumbnail[]>([]);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const referenceImages = React.useMemo(
    () => [...extraImages, ...inspiration, ...persons],
    [extraImages, inspiration, persons],
  );

  const handleAddFiles = React.useCallback(
    async (bucket: UploadBucket, files: File[]) => {
      if (files.length === 0) {
        return;
      }

      try {
        const nextAssets = await Promise.all(files.map(convertFileToAsset));

        if (bucket === "extra") {
          setExtraImages((current) => [...current, ...nextAssets]);
          return;
        }

        if (bucket === "persons") {
          setPersons((current) => [...current, ...nextAssets]);
          return;
        }

        setInspiration(nextAssets.slice(0, 1));

        if (files.length > 1) {
          toast.info("Only the first inspiration image was kept.");
        }
      } catch {
        toast.error("One of the images could not be read.");
      }
    },
    [],
  );

  const handleRemoveFile = React.useCallback(
    (bucket: UploadBucket, id: string) => {
      if (bucket === "extra") {
        setExtraImages((current) => current.filter((file) => file.id !== id));
        return;
      }

      if (bucket === "persons") {
        setPersons((current) => current.filter((file) => file.id !== id));
        return;
      }

      setInspiration((current) => current.filter((file) => file.id !== id));
    },
    [],
  );

  const handleGenerate = React.useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Write a prompt before generating.");
      return;
    }

    setIsGenerating(true);
    setResults([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          count,
          images: referenceImages.map((image) => ({
            dataUrl: image.dataUrl,
            mediaType: image.mediaType,
          })),
        }),
      });

      const payload = (await response.json()) as
        | { images?: GeneratedThumbnail[]; error?: string }
        | undefined;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Generation failed.");
      }

      const images = payload?.images ?? [];

      if (images.length === 0) {
        throw new Error("The model did not return any images.");
      }

      setResults(images);
      toast.success(`Generated ${images.length} thumbnail${images.length > 1 ? "s" : ""}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [count, prompt, referenceImages]);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-20%] h-152 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.2),transparent_38%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.15),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.17),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.12),transparent_25%)]" />
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <Badge
              variant="outline"
              className="rounded-full border-black/10 bg-white/70 px-4 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-white/5"
            >
              Gemini YouTube Thumbnail Studio
            </Badge>

            <div className="space-y-3">
              <h1 className="max-w-3xl font-serif text-5xl leading-none tracking-[-0.04em] text-foreground sm:text-6xl">
                Build cinematic thumbnails from a single prompt.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Minimal, dark-first, and tuned for fast thumbnail ideation. Add
                references, attach inspiration, drop in faces, then generate up
                to four 16:9 variations.
              </p>
            </div>
          </div>

          <ThemeToggle />
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-black/10 bg-white/75 shadow-[0_32px_120px_-48px_rgba(0,0,0,0.45)] backdrop-blur-xl dark:border-white/10 dark:bg-black/45">
          <CardHeader className="gap-4 border-b border-black/10 pb-8 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.28em] text-muted-foreground">
              <span>Prompt</span>
              <Separator orientation="vertical" className="hidden h-4 md:block" />
              <span>{referenceImages.length} reference image{referenceImages.length === 1 ? "" : "s"}</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="font-serif text-3xl tracking-[-0.03em] sm:text-4xl">
                Art direct the shot
              </CardTitle>
              <CardDescription className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                The app automatically appends a thumbnail-focused instruction:
                16:9 ratio, photorealistic, high quality, vibrant colors.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 p-6 sm:p-8">
            <div className="space-y-3">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Luxury cyberpunk podcast thumbnail, dramatic rim light, host centered, ultra-sharp face, bold headline space on the left..."
                className="min-h-40 resize-none rounded-[1.75rem] border-black/10 bg-white/70 px-5 py-4 text-base shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-amber-300/40 dark:border-white/10 dark:bg-white/5"
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <UploadDropzone
                title="Extra Images"
                description="Optional references for composition, objects, colors, or lighting."
                multiple
                files={extraImages}
                onDropFiles={(files) => void handleAddFiles("extra", files)}
                onRemove={(id) => handleRemoveFile("extra", id)}
              />

              <UploadDropzone
                title="Inspiration"
                description="A single mood board image that sets the visual bar."
                files={inspiration}
                onDropFiles={(files) => void handleAddFiles("inspiration", files)}
                onRemove={(id) => handleRemoveFile("inspiration", id)}
              />

              <UploadDropzone
                title="Persons"
                description="Faces or portraits the thumbnail should visually echo."
                multiple
                files={persons}
                onDropFiles={(files) => void handleAddFiles("persons", files)}
                onRemove={(id) => handleRemoveFile("persons", id)}
              />
            </div>

            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-black/10 bg-black/4 p-4 dark:border-white/10 dark:bg-white/4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="size-4" />
                  Variations
                </div>

                <div className="flex flex-wrap gap-2">
                  {countOptions.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={count === value ? "default" : "outline"}
                      className={cn(
                        "rounded-full px-5",
                        count === value
                          ? "bg-foreground text-background hover:bg-foreground/90"
                          : "border-black/10 bg-white/70 hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
                      )}
                      onClick={() => setCount(value)}
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                className="rounded-full px-8"
                onClick={() => void handleGenerate()}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generate thumbnails
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="secondary"
              className="rounded-full bg-black/5 px-4 py-1 dark:bg-white/8"
            >
              <Images className="mr-2 size-4" />
              Output
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-black/10 bg-transparent px-4 py-1 dark:border-white/10"
            >
              <ImagePlus className="mr-2 size-4" />
              16:9
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-black/10 bg-transparent px-4 py-1 dark:border-white/10"
            >
              <UserRound className="mr-2 size-4" />
              Midjourney style
            </Badge>
          </div>

          {isGenerating ? (
            <ResultsSkeleton count={count} />
          ) : results.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {results.map((image, index) => (
                <ThumbnailResultCard key={image.id} image={image} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/40 px-6 py-16 text-center backdrop-blur dark:border-white/10 dark:bg-white/4">
              <p className="font-serif text-3xl tracking-[-0.03em] text-foreground">
                Nothing rendered yet.
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Write a prompt, optionally drop reference images into any panel,
                then generate your first thumbnail set.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

async function convertFileToAsset(file: File): Promise<UploadAsset> {
  const dataUrl = await readAsDataUrl(file);

  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    mediaType: file.type || "image/png",
    dataUrl,
  };
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Failed to read image."));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
}
