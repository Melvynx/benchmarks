"use client";

import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadZoneProps {
  onImagesSelected: (images: string[]) => void;
  maxImages?: number;
  label: string;
  isMultiple?: boolean;
  previewImages?: string[];
}

export function ImageUploadZone({
  onImagesSelected,
  maxImages = 3,
  label,
  isMultiple = true,
  previewImages = [],
}: ImageUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [images, setImages] = useState<string[]>(previewImages);
  const [isLoading, setIsLoading] = useState(false);

  const convertToBase64 = useCallback(
    async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
      });
    },
    []
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      setIsLoading(true);
      try {
        const newImages: string[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith("image/")) continue;

          const base64 = await convertToBase64(file);
          newImages.push(base64);

          if (
            !isMultiple ||
            (newImages.length >= maxImages && newImages.length > 0)
          ) {
            break;
          }
        }

        const updatedImages = isMultiple
          ? [...images, ...newImages].slice(0, maxImages)
          : newImages;

        setImages(updatedImages);
        onImagesSelected(updatedImages);
      } finally {
        setIsLoading(false);
      }
    },
    [images, isMultiple, maxImages, convertToBase64, onImagesSelected]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    onImagesSelected(updated);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2 text-foreground">
        {label}
        {isMultiple && ` (max ${maxImages})`}
      </label>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          multiple={isMultiple}
          accept="image/*"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          id={`file-input-${label}`}
          disabled={isLoading || (images.length >= maxImages && isMultiple)}
        />

        <label
          htmlFor={`file-input-${label}`}
          className="cursor-pointer block"
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            {isLoading ? "Loading..." : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {isMultiple ? "Support multiple images" : "Single image"}
          </p>
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img
                src={img}
                alt={`preview-${idx}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-red-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
