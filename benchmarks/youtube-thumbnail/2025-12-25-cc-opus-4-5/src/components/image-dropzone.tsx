"use client";

import { cn } from "@/lib/utils";
import { ImageIcon, X } from "lucide-react";
import Image from "next/image";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

type ImageDropzoneProps = {
  label: string;
  description: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  multiple?: boolean;
  className?: string;
};

export function ImageDropzone({
  label,
  description,
  images,
  onImagesChange,
  multiple = false,
  className,
}: ImageDropzoneProps) {
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
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple,
  });

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div
        {...getRootProps()}
        className={cn(
          "relative cursor-pointer rounded-lg border-2 border-dashed border-border/50 bg-card/30 p-4 transition-all hover:border-border hover:bg-card/50",
          isDragActive && "border-primary bg-primary/5",
          images.length > 0 && "pb-2"
        )}
      >
        <input {...getInputProps()} />
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <ImageIcon className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              {multiple ? "Drop images or click to upload" : "Drop an image or click to upload"}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {images.map((img, index) => (
              <div key={index} className="group relative">
                <Image
                  src={img}
                  alt={`Upload ${index + 1}`}
                  width={80}
                  height={45}
                  className="rounded-md object-cover"
                  style={{ width: 80, height: 45 }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="size-3 text-destructive-foreground" />
                </button>
              </div>
            ))}
            {multiple && (
              <div className="flex size-[45px] items-center justify-center rounded-md border border-dashed border-border/50 text-muted-foreground/50">
                +
              </div>
            )}
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
