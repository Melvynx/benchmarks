"use client";

import { CircleAlertIcon, DownloadIcon, ImageIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  GeneratedThumbnail,
  GenerationState,
} from "@/features/thumbnail-generator/types";

interface ResultsGridProps {
  generation: GenerationState;
}

export function ResultsGrid({ generation }: ResultsGridProps) {
  const isLoading = generation.status === "loading";
  const pendingCount = isLoading ? generation.pendingCount : 0;
  const hasResults = generation.images.length > 0;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="results-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="results-heading" className="text-lg font-semibold tracking-tight">
          Generated thumbnails
        </h2>
        {hasResults ? (
          <p className="text-sm tabular-nums text-muted-foreground">
            {generation.images.length} result{generation.images.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {generation.status === "error"
          ? ""
          : isLoading
          ? `Generating ${pendingCount} thumbnail${pendingCount === 1 ? "" : "s"}.`
          : hasResults
            ? `${generation.images.length} thumbnail${generation.images.length === 1 ? "" : "s"} ready.`
            : "No thumbnails generated yet."}
      </p>

      {generation.status === "error" ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="flex flex-col gap-1">
            <p className="font-medium text-foreground">Generation did not complete</p>
            <p className="text-muted-foreground">{generation.message} Adjust the prompt or references, then try again.</p>
          </div>
        </div>
      ) : null}

      {!hasResults && !isLoading ? (
        <Empty className="aspect-video max-h-[28rem] min-h-64">
          <EmptyHeader>
            <EmptyMedia>
              <ImageIcon />
            </EmptyMedia>
            <EmptyTitle>Your thumbnails will appear here</EmptyTitle>
            <EmptyDescription>
              Add a prompt and any useful references, then generate up to four options.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {generation.images.map((image, index) => (
            <ThumbnailCard key={image.id} image={image} index={index} />
          ))}
          {Array.from({ length: pendingCount }, (_, index) => (
            <Skeleton
              key={`pending-${index}`}
              className="aspect-video w-full rounded-xl border border-border"
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface ThumbnailCardProps {
  image: GeneratedThumbnail;
  index: number;
}

function ThumbnailCard({ image, index }: ThumbnailCardProps) {
  const source = `data:${image.mediaType};base64,${image.data}`;

  function downloadImage() {
    const extension = getFileExtension(image.mediaType);
    const link = document.createElement("a");
    link.href = source;
    link.download = `gpt-5-6-sol-thumbnail-${index + 1}.${extension}`;
    link.click();
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-secondary">
      <div className="aspect-video">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt={`Generated YouTube thumbnail ${index + 1}`}
          className="size-full object-cover"
        />
      </div>
      <figcaption className="flex min-h-14 items-center justify-between gap-3 border-t border-border bg-background px-3 py-2">
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          Option {index + 1}
        </span>
        <Button type="button" variant="secondary" onClick={downloadImage}>
          <DownloadIcon data-icon="inline-start" />
          Download
        </Button>
      </figcaption>
    </figure>
  );
}

function getFileExtension(mediaType: string) {
  if (mediaType === "image/jpeg") return "jpg";
  if (mediaType === "image/webp") return "webp";
  return "png";
}
