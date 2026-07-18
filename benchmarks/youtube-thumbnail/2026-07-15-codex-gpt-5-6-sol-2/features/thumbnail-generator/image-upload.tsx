"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlusIcon, XIcon, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field";
import { ACCEPTED_IMAGE_INPUT } from "@/features/thumbnail-generator/image-files";
import type { UploadedImage } from "@/features/thumbnail-generator/types";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  description: string;
  icon: LucideIcon;
  images: UploadedImage[];
  maxFiles: number;
  onFilesAdded: (files: File[]) => void;
  onRemove: (imageId: string) => void;
  title: string;
}

export function ImageUpload({
  description,
  icon: Icon,
  images,
  maxFiles,
  onFilesAdded,
  onRemove,
  title,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const descriptionId = `${title.toLowerCase().replaceAll(" ", "-")}-description`;
  const isAtLimit = images.length >= maxFiles;
  const canReplace = maxFiles === 1 && isAtLimit;
  const isPickerDisabled = isAtLimit && !canReplace;

  function openFilePicker() {
    inputRef.current?.click();
  }

  function addSelectedFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    onFilesAdded(Array.from(fileList));
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current -= 1;

    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    addSelectedFiles(event.dataTransfer.files);
  }

  return (
    <FieldSet className="grid h-full grid-rows-[auto_auto_1fr] gap-y-1" aria-describedby={descriptionId}>
      <FieldLegend>{title}</FieldLegend>
      <div className="flex items-start justify-between gap-3">
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {images.length}/{maxFiles}
        </span>
      </div>

      <div
        className={cn(
          "mt-2 flex min-h-44 flex-1 flex-col rounded-xl border border-dashed border-border bg-secondary/35 p-3 transition-[border-color,background-color,transform] duration-150 ease-out",
          isDragging && "scale-[1.005] border-primary bg-primary/5",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={ACCEPTED_IMAGE_INPUT}
          multiple={maxFiles > 1}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => addSelectedFiles(event.target.files)}
        />

        <button
          type="button"
          className="flex min-h-28 flex-1 flex-col items-center justify-center gap-3 rounded-lg px-4 text-center outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45"
          disabled={isPickerDisabled}
          aria-label={
            canReplace
              ? `Replace ${title.toLowerCase()}`
              : isAtLimit
                ? `${title} image limit reached`
                : `Upload ${title.toLowerCase()}`
          }
          onClick={openFilePicker}
        >
          <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            {isDragging ? <ImagePlusIcon className="size-5" /> : <Icon className="size-5" />}
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              {isDragging
                ? "Drop images here"
                : canReplace
                  ? "Drop or click to replace"
                  : isAtLimit
                    ? "Image limit reached"
                    : "Drop images or click to browse"}
            </span>
            <span className="text-xs text-muted-foreground">JPEG, PNG, or WebP. 4 MB each.</span>
          </span>
        </button>

        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-video overflow-hidden rounded-md border border-border bg-background"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.dataUrl}
                  alt={`${title} preview: ${image.name}`}
                  className="size-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-sm"
                  className="absolute right-1 top-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  aria-label={`Remove ${image.name}`}
                  onClick={() => onRemove(image.id)}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </FieldSet>
  );
}
