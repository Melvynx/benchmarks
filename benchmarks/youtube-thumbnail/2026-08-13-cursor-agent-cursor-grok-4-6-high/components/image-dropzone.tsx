"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fileToDataUrl, type ReferenceImage } from "@/lib/images";

type ImageDropzoneProps = {
  label: string;
  hint: string;
  images: ReferenceImage[];
  onChange: (images: ReferenceImage[]) => void;
  multiple?: boolean;
  maxFiles?: number;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export function ImageDropzone({
  label,
  hint,
  images,
  onChange,
  multiple = true,
  maxFiles = 8,
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    async (accepted: File[]) => {
      const remaining = multiple
        ? Math.max(0, maxFiles - images.length)
        : 1;
      const files = accepted.slice(0, remaining);

      if (files.length === 0) {
        toast.error(`You can add up to ${maxFiles} image${maxFiles === 1 ? "" : "s"}.`);
        return;
      }

      try {
        const next = await Promise.all(
          files.map(async (file) => ({
            id: crypto.randomUUID(),
            name: file.name,
            dataUrl: await fileToDataUrl(file),
          })),
        );
        onChange(multiple ? [...images, ...next] : next.slice(0, 1));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not read that image.",
        );
      }
    },
    [images, maxFiles, multiple, onChange],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: { "image/*": [] },
      multiple,
      maxFiles: multiple ? maxFiles : 1,
      maxSize: MAX_FILE_BYTES,
      onDropRejected: (rejections) => {
        const reason = rejections[0]?.errors[0];
        if (reason?.code === "file-too-large") {
          toast.error("Each image must be under 8MB.");
          return;
        }
        toast.error(reason?.message ?? "That file is not a supported image.");
      },
    });

  function removeImage(id: string) {
    onChange(images.filter((image) => image.id !== id));
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-36 cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-input bg-card/40 p-3 transition-colors duration-200",
          isDragActive && "border-primary bg-accent",
          isDragReject && "border-destructive bg-destructive/10",
        )}
      >
        <input {...getInputProps()} />
        {images.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
            <ImagePlusIcon className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop to add" : "Drop images or click"}
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((image) => (
              <li key={image.id} className="relative aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="size-full rounded-lg object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  aria-label={`Remove ${image.name}`}
                  className="absolute top-1 right-1"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeImage(image.id);
                  }}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
