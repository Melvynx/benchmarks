"use client";

import { useState } from "react";
import { DownloadIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { ImageDropzone } from "@/components/image-dropzone";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  downloadImage,
  toPreviewSrc,
  type GeneratedImage,
  type ReferenceImage,
} from "@/lib/images";

const COUNTS = ["1", "2", "3", "4"] as const;

export function ThumbnailStudio() {
  const [prompt, setPrompt] = useState("");
  const [extras, setExtras] = useState<ReferenceImage[]>([]);
  const [inspiration, setInspiration] = useState<ReferenceImage[]>([]);
  const [persons, setPersons] = useState<ReferenceImage[]>([]);
  const [count, setCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  async function generate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      toast.error("Write a prompt before generating.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          images: [...extras, ...inspiration, ...persons].map(
            (image) => image.dataUrl,
          ),
          count: Number(count),
        }),
      });

      const payload = (await response.json()) as {
        images?: GeneratedImage[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      const next = payload.images ?? [];
      if (next.length === 0) {
        throw new Error("No thumbnails came back. Try a more visual prompt.");
      }

      setImages(next);
      toast.success(
        next.length === 1
          ? "Thumbnail ready."
          : `${next.length} thumbnails ready.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-medium tracking-tight">Cursor Grok 4.6</h1>
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
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                void generate();
              }
            }}
            placeholder="A shocked chef holding a flaming skillet, bold yellow title on the left, cinematic lighting"
            className="min-h-32 resize-none rounded-2xl border-input bg-card px-5 py-4 text-lg leading-relaxed md:text-lg"
            disabled={isGenerating}
          />
        </Field>
      </FieldGroup>

      <div className="grid gap-6 md:grid-cols-3">
        <ImageDropzone
          label="Extra images"
          hint="Multi-upload"
          images={extras}
          onChange={setExtras}
          multiple
          maxFiles={8}
        />
        <ImageDropzone
          label="Inspiration"
          hint="Single image"
          images={inspiration}
          onChange={setInspiration}
          multiple={false}
          maxFiles={1}
        />
        <ImageDropzone
          label="Persons"
          hint="Multi-upload"
          images={persons}
          onChange={setPersons}
          multiple
          maxFiles={8}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">Count</p>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[count]}
            onValueChange={(value) => {
              if (value[0]) setCount(value[0]);
            }}
            aria-label="Thumbnail count"
          >
            {COUNTS.map((value) => (
              <ToggleGroupItem key={value} value={value} aria-label={`${value}`}>
                {value}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <Button
          size="lg"
          onClick={() => void generate()}
          disabled={isGenerating}
          className="min-w-36"
        >
          {isGenerating ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SparklesIcon data-icon="inline-start" />
          )}
          Generate
        </Button>
      </div>

      {isGenerating ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: Number(count) }, (_, index) => (
            <Skeleton key={index} className="aspect-video w-full rounded-xl" />
          ))}
        </div>
      ) : images.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <li
              key={`${image.mediaType}-${index}`}
              className="group relative overflow-hidden rounded-xl bg-card"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toPreviewSrc(image)}
                alt={`Generated thumbnail ${index + 1}`}
                className="aspect-video w-full object-cover"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute right-3 bottom-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() =>
                  downloadImage(image, `thumbnail-${index + 1}.png`)
                }
              >
                <DownloadIcon data-icon="inline-start" />
                Download
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty className="min-h-56 border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SparklesIcon />
            </EmptyMedia>
            <EmptyTitle>No thumbnails yet</EmptyTitle>
            <EmptyDescription>
              Write a prompt, drop references if you have them, then generate.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
