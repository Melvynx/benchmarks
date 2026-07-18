"use client";

import {
  ImagesIcon,
  SparklesIcon,
  UserRoundIcon,
  WandSparklesIcon,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImageUpload } from "@/features/thumbnail-generator/image-upload";
import { ResultsGrid } from "@/features/thumbnail-generator/results-grid";
import {
  THUMBNAIL_COUNTS,
  type ThumbnailCount,
} from "@/features/thumbnail-generator/types";
import { useThumbnailGenerator } from "@/features/thumbnail-generator/use-thumbnail-generator";

const UPLOAD_FIELDS = [
  {
    group: "extra" as const,
    title: "Extra images",
    description: "Objects, places, or visual details",
    maxFiles: 6,
    icon: ImagesIcon,
  },
  {
    group: "inspiration" as const,
    title: "Inspiration",
    description: "One composition or style reference",
    maxFiles: 1,
    icon: WandSparklesIcon,
  },
  {
    group: "persons" as const,
    title: "Persons",
    description: "Faces or people to keep recognizable",
    maxFiles: 5,
    icon: UserRoundIcon,
  },
];

export function ThumbnailGenerator() {
  const {
    addFiles,
    count,
    generateThumbnails,
    generation,
    isGenerating,
    prompt,
    removeImage,
    setCount,
    setPrompt,
    uploads,
  } = useThumbnailGenerator();

  function updateCount(value: string) {
    const nextCount = Number(value) as ThumbnailCount;
    if (THUMBNAIL_COUNTS.includes(nextCount)) setCount(nextCount);
  }

  return (
    <main id="main-content" className="min-h-screen px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-9">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">gpt-5.6-sol</h1>
          <ThemeToggle />
        </header>

        <form
          className="flex flex-col gap-7"
          onSubmit={(event) => {
            event.preventDefault();
            void generateThumbnails();
          }}
        >
          <FieldGroup>
            <Field>
              <div className="flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <FieldLabel htmlFor="thumbnail-prompt">Prompt</FieldLabel>
                  <FieldDescription>
                    Describe the composition, subject, text treatment, and mood.
                  </FieldDescription>
                </div>
                <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                  {prompt.length}/4000
                </span>
              </div>
              <Textarea
                id="thumbnail-prompt"
                value={prompt}
                maxLength={4000}
                className="min-h-40 bg-secondary/35 text-lg"
                placeholder="A creator at a desk, dramatic side lighting, bold title on the left…"
                onChange={(event) => setPrompt(event.target.value)}
              />
            </Field>
          </FieldGroup>

          <div className="grid gap-4 md:grid-cols-3">
            {UPLOAD_FIELDS.map((field) => (
              <ImageUpload
                key={field.group}
                title={field.title}
                description={field.description}
                icon={field.icon}
                images={uploads[field.group]}
                maxFiles={field.maxFiles}
                onFilesAdded={(files) => void addFiles(field.group, files)}
                onRemove={(imageId) => removeImage(field.group, imageId)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Field className="flex-row items-center justify-between gap-4 sm:justify-start">
              <FieldTitle id="thumbnail-count-label">Count</FieldTitle>
              <ToggleGroup
                type="single"
                value={String(count)}
                aria-labelledby="thumbnail-count-label"
                onValueChange={updateCount}
              >
                {THUMBNAIL_COUNTS.map((option) => (
                  <ToggleGroupItem key={option} value={String(option)} aria-label={`${option} thumbnail${option === 1 ? "" : "s"}`}>
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              disabled={isGenerating || prompt.trim().length === 0}
            >
              {isGenerating ? (
                <>
                  <Spinner data-icon="inline-start" />
                  Generating…
                </>
              ) : (
                <>
                  <SparklesIcon data-icon="inline-start" />
                  Generate thumbnails
                </>
              )}
            </Button>
          </div>
        </form>

        <ResultsGrid generation={generation} />
      </div>
    </main>
  );
}
