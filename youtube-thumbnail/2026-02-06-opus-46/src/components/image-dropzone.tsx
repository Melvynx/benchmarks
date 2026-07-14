"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImagePlus } from "lucide-react";

type ImageDropzoneProps = {
  label: string;
  description: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  icon?: React.ReactNode;
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
  icon,
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
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
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
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 transition-all ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          {icon ?? <ImagePlus className="h-6 w-6" />}
          <span className="text-xs">{description}</span>
          {isDragActive && (
            <span className="text-xs text-primary">Drop here</span>
          )}
        </div>
      </div>
    </div>
  );
}
