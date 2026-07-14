"use client";

import { cn } from "@/lib/utils";
import { Upload, X } from "lucide-react";
import * as React from "react";

interface ImageUploadProps {
  label: string;
  description: string;
  multiple?: boolean;
  images: string[];
  onImagesChange: (images: string[]) => void;
  icon?: React.ReactNode;
  className?: string;
}

export function ImageUpload({
  label,
  description,
  multiple = false,
  images,
  onImagesChange,
  icon,
  className,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const newImages: string[] = [];

    fileArray.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (multiple) {
            onImagesChange([...images, result]);
          } else {
            onImagesChange([result]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h3 className="font-semibold text-sm">{label}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative group rounded-lg overflow-hidden border border-border bg-muted/50"
            >
              <img
                src={img}
                alt={`Upload ${index + 1}`}
                className="w-20 h-20 object-cover"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200",
          "hover:border-primary/50 hover:bg-muted/50",
          isDragging && "border-primary bg-primary/5 upload-zone-active",
          !isDragging && "border-border"
        )}
      >
        <div className="p-3 rounded-full bg-muted">
          <Upload className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">
            Drop {multiple ? "images" : "an image"} here
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
}
