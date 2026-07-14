"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { fileToBase64 } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface UploadedImage {
  id: string;
  dataUrl: string;
  name: string;
}

interface ImageDropzoneProps {
  label: string;
  hint: string;
  icon: React.ReactNode;
  multiple?: boolean;
  maxFiles?: number;
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  accentClass?: string;
}

export function ImageDropzone({
  label,
  hint,
  icon,
  multiple = true,
  maxFiles = 4,
  images,
  onChange,
  accentClass = "text-violet-400",
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      try {
        const converted: UploadedImage[] = await Promise.all(
          accepted.map(async (file) => ({
            id: crypto.randomUUID(),
            dataUrl: await fileToBase64(file),
            name: file.name,
          }))
        );

        if (!multiple) {
          onChange([converted[0]]);
          return;
        }

        const combined = [...images, ...converted].slice(0, maxFiles);
        if (images.length + converted.length > maxFiles) {
          toast.warning(`Maximum ${maxFiles} images for ${label}`);
        }
        onChange(combined);
      } catch {
        toast.error("Failed to read image file");
      }
    },
    [images, onChange, multiple, maxFiles, label]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"],
    },
    multiple,
    maxFiles,
  });

  const remove = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
  };

  const showDropzone = multiple || images.length === 0;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className={cn("size-3.5", accentClass)}>{icon}</span>
        <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        {multiple && (
          <span className="text-xs text-muted-foreground">
            {images.length}/{maxFiles}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group animate-in"
          >
            <Image
              src={img.dataUrl}
              alt={img.name}
              fill
              unoptimized
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => remove(img.id)}
              className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-md bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {showDropzone && (
          <div
            {...getRootProps()}
            className={cn(
              "relative aspect-square rounded-lg border-2 border-dashed border-border bg-card/30 hover:bg-card/60 hover:border-muted-foreground/40 cursor-pointer transition-all flex flex-col items-center justify-center p-3 text-center",
              isDragActive && "border-violet-500 bg-violet-500/5 scale-[0.98]"
            )}
          >
            <input {...getInputProps()} />
            <Upload
              className={cn(
                "size-5 text-muted-foreground mb-1.5 transition-colors",
                isDragActive && "text-violet-400"
              )}
            />
            <p className="text-[11px] leading-tight text-muted-foreground">
              {isDragActive ? "Drop here" : hint}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
