"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadZoneProps {
  title: string;
  description: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  className?: string;
}

export function ImageUploadZone({
  title,
  description,
  images,
  onImagesChange,
  multiple = false,
  className,
}: ImageUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const processFiles = async () => {
        const newImages: string[] = [];

        for (const file of acceptedFiles) {
          const base64 = await fileToBase64(file);
          newImages.push(base64);
        }

        if (multiple) {
          onImagesChange([...images, ...newImages]);
        } else {
          onImagesChange(newImages.slice(0, 1));
        }
      };

      processFiles();
    },
    [images, multiple, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium text-foreground/80">{title}</div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative group w-16 h-16 rounded-lg overflow-hidden border border-border"
            >
              <img
                src={img}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 cursor-pointer transition-all duration-200",
          "flex flex-col items-center justify-center gap-2 min-h-[100px]",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <>
            <Upload className="w-6 h-6 text-primary" />
            <p className="text-sm text-primary">Drop here...</p>
          </>
        ) : (
          <>
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <p className="text-xs text-muted-foreground text-center">
              {description}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}
