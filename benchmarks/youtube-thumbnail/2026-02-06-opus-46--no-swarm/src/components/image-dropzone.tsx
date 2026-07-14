"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  label: string;
  description: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
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
  maxFiles = 1,
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newImages = await Promise.all(acceptedFiles.map(fileToBase64));
      if (multiple) {
        onImagesChange([...images, ...newImages].slice(0, maxFiles));
      } else {
        onImagesChange(newImages.slice(0, 1));
      }
    },
    [images, onImagesChange, multiple, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple,
    maxFiles: multiple ? maxFiles - images.length : 1,
    disabled: !multiple && images.length >= 1,
  });

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <p className="text-xs text-muted-foreground">{description}</p>

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

      {(multiple ? images.length < maxFiles : images.length === 0) && (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <Upload className="h-6 w-6 text-primary" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {isDragActive ? "Drop here" : "Drag & drop or click"}
          </span>
        </div>
      )}
    </div>
  );
}
