"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

type ImageUploadProps = {
  label: string;
  description: string;
  multiple: boolean;
  images: string[];
  onImagesChange: (images: string[]) => void;
  icon?: React.ReactNode;
};

export function ImageUpload({
  label,
  description,
  multiple,
  images,
  onImagesChange,
  icon,
}: ImageUploadProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const base64Files = await Promise.all(acceptedFiles.map(fileToBase64));
      if (multiple) {
        onImagesChange([...images, ...base64Files]);
      } else {
        onImagesChange(base64Files.slice(0, 1));
      }
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
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-muted/50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {icon && (
            <div className="text-muted-foreground">{icon}</div>
          )}
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={i} className="group relative aspect-video overflow-hidden rounded-lg">
              <img
                src={img}
                alt={`Upload ${i + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 rounded-full bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
