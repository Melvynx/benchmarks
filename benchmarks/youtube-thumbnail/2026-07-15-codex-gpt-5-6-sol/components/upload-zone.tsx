"use client";

import * as React from "react";
import { ImagePlus, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadItem = {
  id: string;
  name: string;
  dataUrl: string;
};

type UploadZoneProps = {
  kind: "extra" | "inspiration" | "persons";
  title: string;
  description: string;
  files: UploadItem[];
  onFilesChange: (files: UploadItem[]) => void;
  multiple?: boolean;
  maxFiles?: number;
};

const icons = {
  extra: ImagePlus,
  inspiration: Sparkles,
  persons: Users,
};

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function UploadZone({
  kind,
  title,
  description,
  files,
  onFilesChange,
  multiple = false,
  maxFiles = 1,
}: UploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const Icon = icons[kind];

  async function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const images = incoming.filter((file) => file.type.startsWith("image/"));
    const withinSize = images.filter((file) => file.size <= 5 * 1024 * 1024);

    if (images.length !== incoming.length) {
      toast.error("Only image files can be uploaded.");
    }
    if (withinSize.length !== images.length) {
      toast.error("Images must be 5 MB or smaller.");
    }
    if (withinSize.length === 0) return;

    const available = multiple ? Math.max(maxFiles - files.length, 0) : 1;
    const selected = withinSize.slice(0, available);

    if (selected.length < withinSize.length) {
      toast.error(`This area accepts up to ${maxFiles} image${maxFiles > 1 ? "s" : ""}.`);
    }
    if (selected.length === 0) return;

    try {
      const converted = await Promise.all(
        selected.map(async (file) => ({
          id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
          name: file.name,
          dataUrl: await fileToDataUrl(file),
        })),
      );

      onFilesChange(multiple ? [...files, ...converted] : converted.slice(0, 1));
    } catch {
      toast.error("One of the images could not be read.");
    }
  }

  function removeFile(event: React.MouseEvent, id: string) {
    event.stopPropagation();
    onFilesChange(files.filter((file) => file.id !== id));
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={`Upload ${title.toLowerCase()}`}
        className={cn(
          "group relative flex min-h-44 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 p-3 outline-none transition-colors hover:border-foreground/30 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
          isDragging && "border-foreground bg-accent",
        )}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void addFiles(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        {files.length > 0 ? (
          <div
            className={cn(
              "grid w-full gap-2",
              files.length === 1 ? "grid-cols-1" : "grid-cols-2",
            )}
          >
            {files.map((file) => (
              <div
                key={file.id}
                className="group/preview relative aspect-video overflow-hidden rounded-lg border bg-background"
              >
                {/* Data URLs are selected locally and do not benefit from Next image optimization. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={file.dataUrl}
                  alt={file.name}
                  className="size-full object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={`Remove ${file.name}`}
                  className="absolute right-1.5 top-1.5 opacity-90"
                  onClick={(event) => removeFile(event, file.id)}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-10 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
              <ImagePlus className="size-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium">
                {isDragging ? "Drop images here" : "Drop or click to upload"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                PNG, JPG or WebP · 5 MB max
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
