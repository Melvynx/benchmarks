"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ThumbnailHero } from "@/components/ui/thumbnail-hero";
import {
  UploadDropzone,
  UploadDropzoneValue,
} from "@/components/ui/upload-dropzone";
import { ThumbnailToolbar } from "@/components/ui/thumbnail-toolbar";
import { ThumbnailSkeleton } from "@/components/ui/thumbnail-skeleton";
import { ThumbnailGrid } from "@/components/ui/thumbnail-grid";

const PROMPT_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";

export default function ThumbnailApp() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(2);
  const [extras, setExtras] = useState<UploadDropzoneValue[]>([]);
  const [inspiration, setInspiration] = useState<UploadDropzoneValue[]>([]);
  const [persons, setPersons] = useState<UploadDropzoneValue[]>([]);
  const [images, setImages] = useState<{ data: string; mediaType: string }[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);

  const mergedImages = useMemo(() => {
    return [
      ...extras.map((item) => item.dataUrl),
      ...inspiration.map((item) => item.dataUrl),
      ...persons.map((item) => item.dataUrl),
    ];
  }, [extras, inspiration, persons]);

  const hasPayload = prompt.trim().length > 0;

  const handleGenerate = async () => {
    if (!hasPayload) {
      toast.error("Add a prompt before generating.");
      return;
    }

    setIsLoading(true);
    setImages([]);

    try {
      const requests = Array.from({ length: count }).map(() =>
        fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${prompt}\n\n${PROMPT_SUFFIX}`,
            images: mergedImages,
          }),
        })
      );

      const responses = await Promise.all(requests);
      for (const response of responses) {
        if (!response.ok) {
          throw new Error("Generation failed.");
        }
      }

      const payloads = await Promise.all(
        responses.map((response) => response.json())
      );

      const nextImages = payloads.flatMap(
        (payload) => payload.images as { data: string; mediaType: string }[]
      );

      setImages(nextImages);
      if (nextImages.length === 0) {
        toast.error("No images returned. Try again.");
      }
    } catch (error) {
      toast.error("Something went wrong while generating images.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (index: number) => {
    const image = images[index];
    if (!image) {
      return;
    }

    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.png`;
    link.click();
  };

  return (
    <div className="space-y-10">
      <ThumbnailHero />

      <section className="space-y-6">
        <div className="rounded-3xl border border-foreground/10 bg-background/60 p-6 backdrop-blur">
          <Textarea
            placeholder="Describe the thumbnail you want to generate..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            className="min-h-[140px] border-foreground/15 bg-transparent text-base"
          />
          <div className="mt-4 flex items-center justify-between text-xs text-soft">
            <span>Be specific about scene, lighting, subject, typography.</span>
            <span>{prompt.length} chars</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-foreground/10 bg-background/60 p-5 backdrop-blur">
            <UploadDropzone
              title="Extra Images"
              subtitle="Multi-upload"
              description="Optional"
              multiple
              maxFiles={6}
              value={extras}
              onChange={setExtras}
            />
          </div>
          <div className="rounded-3xl border border-foreground/10 bg-background/60 p-5 backdrop-blur">
            <UploadDropzone
              title="Inspiration"
              subtitle="Single image"
              description="Style ref"
              maxFiles={1}
              value={inspiration}
              onChange={setInspiration}
            />
          </div>
          <div className="rounded-3xl border border-foreground/10 bg-background/60 p-5 backdrop-blur">
            <UploadDropzone
              title="Persons"
              subtitle="Multi-upload"
              description="Subject"
              multiple
              maxFiles={3}
              value={persons}
              onChange={setPersons}
            />
          </div>
        </div>

        <ThumbnailToolbar
          count={count}
          onCountChange={setCount}
          onGenerate={handleGenerate}
          isLoading={isLoading}
        />
      </section>

      <section className="rounded-3xl border border-foreground/10 bg-background/60 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Generated Thumbnails</h2>
            <p className="text-sm text-soft">
              Download or iterate. Each run keeps your references intact.
            </p>
          </div>
          {images.length > 0 ? (
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => setImages([])}
            >
              Clear
            </Button>
          ) : null}
        </div>
        <div className="mt-6">
          {isLoading ? (
            <ThumbnailSkeleton count={count} />
          ) : images.length > 0 ? (
            <ThumbnailGrid images={images} onDownload={handleDownload} />
          ) : (
            <div className="rounded-3xl border border-dashed border-foreground/15 bg-background/40 px-6 py-16 text-center text-sm text-soft">
              Upload references, add a prompt, and generate thumbnails.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
