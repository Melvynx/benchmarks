"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Download, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ImageDropzone } from "@/components/image-dropzone";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { GeneratedThumbnail, UploadedImage } from "@/lib/types";

const COUNT_OPTIONS = [1, 2, 3, 4] as const;
const MAX_REFERENCE_IMAGES = 14;
const REQUEST_BUDGET_BYTES = 9.5 * 1024 * 1024;
const PROMPT_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";

type GenerateResponse = {
  images?: Array<{
    data: string;
    mediaType: string;
  }>;
  warning?: string;
  error?: string;
};

function fileToDataUrl(file: File) {
  return new Promise<UploadedImage>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result;

      if (typeof dataUrl !== "string") {
        reject(new Error(`Failed to read ${file.name}.`));
        return;
      }

      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        dataUrl,
        mediaType: file.type || "image/png",
      });
    };

    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function estimateBase64PayloadBytes(size: number) {
  return Math.ceil(size / 3) * 4 + 256;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function ThumbnailGenerator() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState<(typeof COUNT_OPTIONS)[number]>(2);
  const [extraImages, setExtraImages] = useState<UploadedImage[]>([]);
  const [inspirationImage, setInspirationImage] = useState<UploadedImage | null>(
    null,
  );
  const [personImages, setPersonImages] = useState<UploadedImage[]>([]);
  const [results, setResults] = useState<GeneratedThumbnail[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const referenceCount =
    extraImages.length + personImages.length + (inspirationImage ? 1 : 0);

  const uploadBytes = useMemo(() => {
    const images = [
      ...extraImages,
      ...personImages,
      ...(inspirationImage ? [inspirationImage] : []),
    ];

    return images.reduce((total, image) => total + image.size, 0);
  }, [extraImages, inspirationImage, personImages]);

  const estimatedRequestBytes = useMemo(() => {
    const images = [
      ...extraImages,
      ...personImages,
      ...(inspirationImage ? [inspirationImage] : []),
    ];

    return images.reduce(
      (total, image) => total + estimateBase64PayloadBytes(image.size),
      0,
    );
  }, [extraImages, inspirationImage, personImages]);

  const uploadBudgetExceeded = estimatedRequestBytes > REQUEST_BUDGET_BYTES;

  async function convertFiles(files: File[]) {
    return Promise.all(files.map((file) => fileToDataUrl(file)));
  }

  function getRemainingSlots(nextIncludesInspiration = false) {
    return (
      MAX_REFERENCE_IMAGES -
      extraImages.length -
      personImages.length -
      (inspirationImage || nextIncludesInspiration ? 1 : 0)
    );
  }

  async function handleExtraDrop(files: File[]) {
    try {
      const remaining = getRemainingSlots();

      if (remaining <= 0) {
        toast.error(`You can attach up to ${MAX_REFERENCE_IMAGES} references.`);
        return;
      }

      const limitedFiles = files.slice(0, remaining);
      const nextImages = await convertFiles(limitedFiles);
      setExtraImages((current) => [...current, ...nextImages]);

      if (limitedFiles.length < files.length) {
        toast.warning(`Only ${MAX_REFERENCE_IMAGES} total references are allowed.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load extra images.",
      );
    }
  }

  async function handlePersonDrop(files: File[]) {
    try {
      const remaining = getRemainingSlots();

      if (remaining <= 0) {
        toast.error(`You can attach up to ${MAX_REFERENCE_IMAGES} references.`);
        return;
      }

      const limitedFiles = files.slice(0, remaining);
      const nextImages = await convertFiles(limitedFiles);
      setPersonImages((current) => [...current, ...nextImages]);

      if (limitedFiles.length < files.length) {
        toast.warning(`Only ${MAX_REFERENCE_IMAGES} total references are allowed.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load person images.",
      );
    }
  }

  async function handleInspirationDrop(files: File[]) {
    try {
      const nextFile = files[0];

      if (!nextFile) {
        return;
      }

      if (!inspirationImage && getRemainingSlots(true) < 0) {
        toast.error(`You can attach up to ${MAX_REFERENCE_IMAGES} references.`);
        return;
      }

      const [nextImage] = await convertFiles([nextFile]);
      setInspirationImage(nextImage);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load inspiration image.",
      );
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Add a prompt before generating.");
      return;
    }

    if (uploadBudgetExceeded) {
      toast.error(
        "Reference uploads are too large after base64 encoding. Remove some images or use smaller files.",
      );
      return;
    }

    setIsGenerating(true);
    setResults([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          count,
          extraImages,
          inspirationImage,
          personImages,
        }),
      });

      const payload = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      const nextResults =
        payload.images?.map((image, index) => ({
          id: `${Date.now()}-${index}`,
          dataUrl: `data:${image.mediaType};base64,${image.data}`,
          mediaType: image.mediaType,
        })) ?? [];

      if (nextResults.length === 0) {
        throw new Error("The model did not return any images.");
      }

      setResults(nextResults);
      toast.success(
        `Generated ${nextResults.length} thumbnail${nextResults.length > 1 ? "s" : ""}.`,
      );

      if (payload.warning) {
        toast.warning(payload.warning);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate thumbnails.";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="panel-surface rounded-[32px] border border-border/70 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            The final prompt always appends: {`"${PROMPT_SUFFIX}"`}
          </div>
          <Textarea
            className="min-h-40 rounded-[28px] border-border/70 bg-background/70 px-5 py-4 text-base leading-7 shadow-none"
            placeholder="Describe the thumbnail scene, subject, emotion, composition, style cues, and any text treatment you want the model to imply."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ImageDropzone
            description="Extra visual references for lighting, props, palettes, backgrounds, or composition."
            footer={`${extraImages.length} attached`}
            images={extraImages}
            multiple
            onDropAccepted={handleExtraDrop}
            onDropRejected={(message) => toast.error(message)}
            onRemove={(id) =>
              setExtraImages((current) =>
                current.filter((image) => image.id !== id),
              )
            }
            title="Extra Images"
          />

          <ImageDropzone
            description="A single north-star image to steer overall aesthetic direction."
            footer={inspirationImage ? "1 attached" : "Optional"}
            images={inspirationImage ? [inspirationImage] : []}
            onDropAccepted={handleInspirationDrop}
            onDropRejected={(message) => toast.error(message)}
            onRemove={() => setInspirationImage(null)}
            title="Inspiration"
          />

          <ImageDropzone
            description="Upload faces or people you want the model to preserve as reference subjects."
            footer={`${personImages.length} attached`}
            images={personImages}
            multiple
            onDropAccepted={handlePersonDrop}
            onDropRejected={(message) => toast.error(message)}
            onRemove={(id) =>
              setPersonImages((current) =>
                current.filter((image) => image.id !== id),
              )
            }
            title="Persons"
          />
        </div>

        <div className="flex flex-col gap-4 rounded-[26px] border border-border/70 bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Count
            </p>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map((option) => (
                <Button
                  className={cn(
                    "min-w-12 rounded-full",
                    option === count &&
                      "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                  )}
                  key={option}
                  type="button"
                  variant={option === count ? "default" : "outline"}
                  onClick={() => setCount(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <span>{referenceCount}/{MAX_REFERENCE_IMAGES} refs</span>
              <span>{(uploadBytes / 1024 / 1024).toFixed(2)} MB uploaded</span>
              <span>
                {(estimatedRequestBytes / 1024 / 1024).toFixed(2)} MB estimated request
              </span>
              <span>{uploadBudgetExceeded ? "Over request budget" : "Within budget"}</span>
            </div>
            <Button
              className="h-12 min-w-44 rounded-full px-6 text-sm font-semibold tracking-[0.16em] uppercase"
              disabled={isGenerating}
              size="lg"
              type="button"
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <Sparkles />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Generated thumbnails
              </h2>
              <p className="text-sm text-muted-foreground">
                16:9 output ready for download.
              </p>
            </div>
          </div>

          {isGenerating ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: count }).map((_, index) => (
                <div
                  className="space-y-3 rounded-[24px] border border-border/70 bg-card/50 p-3"
                  key={index}
                >
                  <Skeleton className="aspect-video rounded-[18px]" />
                  <Skeleton className="h-10 rounded-full" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {results.map((result, index) => (
                <article
                  className="overflow-hidden rounded-[24px] border border-border/70 bg-card/60"
                  key={result.id}
                >
                  <div className="relative aspect-video">
                    <Image
                      alt={`Generated thumbnail ${index + 1}`}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      src={result.dataUrl}
                      unoptimized
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Thumbnail {index + 1}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {result.mediaType}
                      </p>
                    </div>
                    <Button
                      className="rounded-full"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        downloadDataUrl(
                          result.dataUrl,
                          `youtube-thumbnail-${index + 1}.${
                            result.mediaType.split("/")[1] === "jpeg"
                              ? "jpg"
                              : (result.mediaType.split("/")[1] ?? "png")
                          }`,
                        )
                      }
                    >
                      <Download />
                      Download
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-border/80 bg-background/40 px-6 py-16 text-center">
              <p className="text-base font-medium">No thumbnails yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add a prompt, attach references if needed, and generate your first set.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
