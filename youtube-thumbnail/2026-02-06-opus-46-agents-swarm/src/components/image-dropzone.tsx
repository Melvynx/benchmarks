"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  label: string;
  description: string;
};

export function ImageDropzone({
  images,
  onImagesChange,
  multiple = false,
  label,
  description,
}: ImageDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const readers = acceptedFiles.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      );

      Promise.all(readers).then((results) => {
        if (multiple) {
          onImagesChange([...images, ...results]);
        } else {
          onImagesChange([results[0]]);
        }
      });
    },
    [images, multiple, onImagesChange]
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
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
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
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {(multiple || images.length === 0) && (
        <div
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          )}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <div className="flex flex-col items-center gap-2 text-primary">
              <Upload className="h-6 w-6" />
              <p className="text-sm">Drop here</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImageIcon className="h-6 w-6" />
              <p className="text-sm">{description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
