"use client";

import { DownloadIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImageDropzone } from "@/components/image-dropzone";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { UploadedImage } from "@/lib/files";

type GeneratedImage = {
  data: string;
  mediaType: string;
};

const COUNTS = [1, 2, 3, 4] as const;

function extensionFor(mediaType: string) {
  if (mediaType.includes("jpeg") || mediaType.includes("jpg")) return "jpg";
  if (mediaType.includes("webp")) return "webp";
  return "png";
}

function downloadImage(image: GeneratedImage, index: number) {
  const link = document.createElement("a");
  link.href = `data:${image.mediaType};base64,${image.data}`;
  link.download = `thumbnail-${index + 1}.${extensionFor(image.mediaType)}`;
  link.click();
}

export function ThumbnailStudio() {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState<(typeof COUNTS)[number]>(1);
  const [extra, setExtra] = useState<UploadedImage[]>([]);
  const [inspiration, setInspiration] = useState<UploadedImage[]>([]);
  const [persons, setPersons] = useState<UploadedImage[]>([]);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(false);

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Write a prompt first.");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          count,
          extra: extra.map((image) => image.dataUrl),
          inspiration: inspiration.map((image) => image.dataUrl),
          persons: persons.map((image) => image.dataUrl),
        }),
      });

      const payload = (await response.json()) as {
        images?: GeneratedImage[];
        error?: string;
      };

      if (!response.ok || !payload.images?.length) {
        throw new Error(payload.error || "Generation failed.");
      }

      setResults(payload.images);
      toast.success(payload.images.length === 1 ? "Generated" : `Generated ${payload.images.length}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-medium tracking-tight">Grok 4.7</h1>
        <ThemeToggle />
      </header>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="prompt" className="sr-only">
            Prompt
          </FieldLabel>
          <Textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="A founder mid-laugh beside a giant play button, city night behind them"
            className="min-h-36 resize-y rounded-2xl px-4 py-4 text-base md:text-lg"
            disabled={loading}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <ImageDropzone
            id="extra-images"
            label="Extra images"
            description="Other references to mix in"
            images={extra}
            multiple
            maxFiles={6}
            onChange={setExtra}
            disabled={loading}
          />
          <ImageDropzone
            id="inspiration"
            label="Inspiration"
            description="One image for style"
            images={inspiration}
            maxFiles={1}
            onChange={setInspiration}
            disabled={loading}
          />
          <ImageDropzone
            id="persons"
            label="Persons"
            description="People who should appear"
            images={persons}
            multiple
            maxFiles={4}
            onChange={setPersons}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Field orientation="horizontal" className="w-auto">
            <FieldLabel htmlFor="count-1">Count</FieldLabel>
            <ToggleGroup
              variant="outline"
              spacing={0}
              value={[String(count)]}
              disabled={loading}
              onValueChange={(value) => {
                const next = Number(value[0]);
                if (next === 1 || next === 2 || next === 3 || next === 4) {
                  setCount(next);
                }
              }}
            >
              {COUNTS.map((value) => (
                <ToggleGroupItem
                  key={value}
                  id={`count-${value}`}
                  value={String(value)}
                  className="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {value}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            disabled={loading || prompt.trim().length === 0}
            onClick={() => void generate()}
          >
            {loading ? <Loader2Icon className="animate-spin" /> : null}
            Generate
          </Button>
        </div>
      </FieldGroup>

      <Separator />

      <section aria-live="polite" className="grid gap-4 sm:grid-cols-2">
        {loading
          ? COUNTS.slice(0, count).map((value) => (
              <Skeleton key={value} className="aspect-video w-full rounded-xl" />
            ))
          : null}

        {!loading && results.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-input text-sm text-muted-foreground sm:col-span-2">
            Generated thumbnails land here.
          </div>
        ) : null}

        {!loading
          ? results.map((image, index) => (
              <figure
                key={`${image.data.slice(0, 24)}-${index}`}
                className="relative overflow-hidden rounded-xl border bg-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:${image.mediaType};base64,${image.data}`}
                  alt={`Thumbnail ${index + 1}`}
                  className="aspect-video w-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute right-3 bottom-3"
                  onClick={() => downloadImage(image, index)}
                >
                  <DownloadIcon />
                  Download
                </Button>
              </figure>
            ))
          : null}
      </section>
    </main>
  );
}
