"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  label: string;
  description: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  maxFiles?: number;
}

export function ImageUpload({
  label,
  description,
  images,
  onImagesChange,
  multiple = false,
  maxFiles = 5,
}: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const filesToProcess = multiple
        ? acceptedFiles.slice(0, maxFiles - images.length)
        : acceptedFiles.slice(0, 1);

      filesToProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          onImagesChange(
            multiple ? [...images, base64] : [base64]
          );
        };
        reader.readAsDataURL(file);
      });
    },
    [images, onImagesChange, multiple, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple,
    maxFiles: multiple ? maxFiles - images.length : 1,
    disabled: !multiple && images.length >= 1,
  });

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const canAddMore = multiple ? images.length < maxFiles : images.length < 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">{label}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {multiple && (
          <span className="text-xs text-muted-foreground">
            {images.length}/{maxFiles}
          </span>
        )}
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border"
            >
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
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
          <div className="flex items-center gap-2 text-muted-foreground">
            {isDragActive ? (
              <ImageIcon className="w-5 h-5 text-primary" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span className="text-sm">
              {isDragActive
                ? "Drop image here"
                : multiple
                ? "Drag & drop or click to upload"
                : "Drag & drop or click"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
