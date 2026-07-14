"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UploadedImage } from "@/lib/types";

type ImageDropzoneProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  images: UploadedImage[];
  multiple?: boolean;
  onDropAccepted: (files: File[]) => void | Promise<void>;
  onDropRejected?: (message: string) => void;
  onRemove: (id: string) => void;
};

export function ImageDropzone({
  title,
  description,
  footer,
  images,
  multiple = false,
  onDropAccepted,
  onDropRejected,
  onRemove,
}: ImageDropzoneProps) {
  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    accept: { "image/*": [] },
    multiple,
    noClick: true,
    onDropAccepted,
    onDropRejected: (rejections) => {
      const firstMessage =
        rejections[0]?.errors[0]?.message ?? "Only image files are allowed.";
      onDropRejected?.(firstMessage);
    },
  });

  return (
    <section className="space-y-3 rounded-[24px] border border-border/70 bg-card/50 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-[0.18em] uppercase text-foreground/90">
            {title}
          </h3>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <Button
          className="rounded-full"
          size="sm"
          type="button"
          variant="outline"
          onClick={open}
        >
          <Upload />
          Upload
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "group relative rounded-[22px] border border-dashed border-border/80 bg-background/60 p-5 transition-all",
          "hover:border-primary/60 hover:bg-background/90",
          isDragActive && "border-primary bg-primary/8 shadow-[0_0_0_1px_var(--color-primary)]",
        )}
      >
        <input {...getInputProps()} />
        <div className="flex min-h-36 flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full border border-border/80 bg-card/80 p-3">
            <ImagePlus className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive ? "Drop images here" : "Drag and drop images"}
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {multiple ? "Multi-upload" : "Single image"}
            </p>
          </div>
        </div>
      </div>

      {footer ? <div className="text-xs text-muted-foreground">{footer}</div> : null}

      {images.length > 0 ? (
        <div
          className={cn(
            "grid gap-3",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {images.map((image) => (
            <div
              className="group relative overflow-hidden rounded-[20px] border border-border/70 bg-background/80"
              key={image.id}
            >
              <div className="relative aspect-[16/10]">
                <Image
                  alt={image.name}
                  className="object-cover"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  src={image.dataUrl}
                  unoptimized
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-3 text-white">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{image.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">
                    {(image.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  className="rounded-full border-white/20 bg-black/40 text-white hover:bg-black/60"
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(image.id);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
