"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  label: string;
  description: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  className?: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageDropzone({
  label,
  description,
  images,
  onImagesChange,
  multiple = false,
  className,
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newImages = await Promise.all(acceptedFiles.map(fileToBase64));
      if (multiple) {
        onImagesChange([...images, ...newImages]);
      } else {
        onImagesChange(newImages.slice(0, 1));
      }
    },
    [images, multiple, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple,
  });

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">
        {label}
      </span>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="group relative">
              <img
                src={img}
                alt={`Upload ${i + 1}`}
                className="h-20 w-20 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-all",
          "border-border/50 hover:border-border hover:bg-accent/30",
          isDragActive && "border-primary bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/50">
          {isDragActive ? (
            <Upload className="h-5 w-5 text-primary" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {isDragActive ? "Drop here" : description}
          </p>
        </div>
      </div>
    </div>
  );
}
