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
    [images, onImagesChange, multiple]
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
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img
                src={img}
                alt={`Upload ${i + 1}`}
                className="h-20 w-20 rounded-lg object-cover border border-border"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          {isDragActive ? (
            <Upload className="h-5 w-5 text-primary" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
          <span className="text-xs">{description}</span>
        </div>
      </div>
    </div>
  );
}
