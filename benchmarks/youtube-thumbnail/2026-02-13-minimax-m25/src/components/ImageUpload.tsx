"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxFiles?: number;
  label: string;
}

export function ImageUpload({
  images,
  onChange,
  maxFiles = 4,
  label,
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newImages: string[] = [];
      for (const file of acceptedFiles) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            const base64 = reader.result.split(",")[1];
            newImages.push(base64);
            if (newImages.length === acceptedFiles.length) {
              onChange([...images, ...newImages].slice(0, maxFiles));
            }
          }
        };
        reader.readAsDataURL(file);
      }
    },
    [images, maxFiles, onChange]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: maxFiles,
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
  });

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50",
          images.length > 0 && "border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Upload className="w-8 h-8 mb-2" />
            <p className="text-sm">Drag & drop or click to upload</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={`data:image/jpeg;base64,${img}`}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-20 object-cover rounded"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {images.length < maxFiles && (
              <div className="flex items-center justify-center h-20 border border-dashed rounded bg-muted/30">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
