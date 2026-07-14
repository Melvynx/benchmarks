"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageIcon, Plus, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

interface ImageUploadProps {
  label: string;
  description: string;
  multiple?: boolean;
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

// Rajouter du code
export function ImageUpload({
  label,
  description,
  multiple,
  images,
  onImagesChange,
  maxImages,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;

    const newImages: string[] = [];
    const maxToAdd = multiple ? (maxImages ?? Infinity) - images.length : 1;

    for (let i = 0; i < Math.min(files.length, maxToAdd); i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const base64 = await fileToBase64(file);
        newImages.push(base64);
      }
    }

    if (multiple) {
      onImagesChange([...images, ...newImages].slice(0, maxImages));
    } else {
      onImagesChange(newImages.slice(0, 1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const hasImages = images.length > 0;
  const canAddMore = multiple && images.length < (maxImages ?? Infinity);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <p className="text-xs text-muted-foreground">{description}</p>

      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          hasImages ? "p-3" : "p-6",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {hasImages ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {images.length} {images.length === 1 ? "image" : "images"}
              </span>
              {canAddMore && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add more
                </Button>
              )}
            </div>
            <div
              className={cn(
                "grid gap-2",
                multiple ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1",
              )}
            >
              {images.map((img, index) => (
                <div key={index} className="group relative aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Upload ${index + 1}`}
                    className="h-full w-full rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center"
            onClick={() => inputRef.current?.click()}
          >
            <div className="rounded-full bg-muted p-3">
              {multiple ? (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop {multiple ? "images" : "an image"} here
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
