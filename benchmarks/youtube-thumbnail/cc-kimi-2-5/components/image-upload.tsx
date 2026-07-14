"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImageIcon } from "lucide-react";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  label: string;
  accept?: string;
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 1,
  label,
}: ImageUploadProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const remainingSlots = maxImages - images.length;
      const filesToProcess = acceptedFiles.slice(0, remainingSlots);

      const newImages: string[] = [];

      for (const file of filesToProcess) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
          };
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        newImages.push(base64);
      }

      onImagesChange([...images, ...newImages].slice(0, maxImages));
    },
    [images, maxImages, onImagesChange]
  );

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    disabled: images.length >= maxImages,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden border border-border/50 group"
            >
              <img
                src={img}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black/90 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`
            relative flex flex-col items-center justify-center
            border-2 border-dashed rounded-xl p-6
            cursor-pointer transition-all duration-200
            ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50 hover:bg-muted/50"
            }
          `}
        >
          <input {...getInputProps()} />
          <div
            className={`
            p-3 rounded-full mb-3 transition-colors
            ${isDragActive ? "bg-primary/10" : "bg-muted"}
          `}
          >
            {isDragActive ? (
              <Upload
                className={`w-5 h-5 ${isDragActive ? "text-primary" : "text-muted-foreground"}`}
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {isDragActive ? (
              "Drop images here..."
            ) : (
              <>
                <span className="text-primary">Click to upload</span> or drag
                and drop
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            JPEG, PNG, WebP up to 10MB
          </p>
        </div>
      )}
    </div>
  );
}
