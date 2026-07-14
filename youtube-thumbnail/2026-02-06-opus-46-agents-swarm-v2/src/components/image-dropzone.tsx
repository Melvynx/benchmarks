"use client";

import { useDropzone } from "react-dropzone";
import { useCallback } from "react";

interface ImageDropzoneProps {
  label: string;
  description: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
}

export function ImageDropzone({
  label,
  description,
  images,
  onImagesChange,
  multiple = true,
  maxFiles = 10,
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const filesToProcess = multiple
        ? acceptedFiles.slice(0, maxFiles - images.length)
        : acceptedFiles.slice(0, 1);

      Promise.all(
        filesToProcess.map(
          (file) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            })
        )
      ).then((results) => {
        if (multiple) {
          onImagesChange([...images, ...results].slice(0, maxFiles));
        } else {
          onImagesChange(results.slice(0, 1));
        }
      });
    },
    [images, onImagesChange, multiple, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple,
    maxFiles: multiple ? maxFiles : 1,
  });

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div
        {...getRootProps()}
        className={`h-32 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-sm text-primary font-medium">Drop here</p>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-muted-foreground">
              Click or drag images here
            </p>
          </>
        )}
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt={`Upload ${i + 1}`}
                className="h-16 w-16 rounded-md object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
