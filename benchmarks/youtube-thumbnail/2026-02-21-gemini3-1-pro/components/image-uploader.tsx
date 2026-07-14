"use client";

import { useDropzone } from "react-dropzone";
import { X, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  label: string;
  maxFiles?: number;
  value: string[];
  onChange: (images: string[]) => void;
  className?: string;
}

export function ImageUploader({
  label,
  maxFiles = 1,
  value,
  onChange,
  className,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      try {
        const filePromises = acceptedFiles.map((file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
          });
        });

        const base64Images = await Promise.all(filePromises);

        let newValues;
        if (maxFiles === 1) {
          newValues = [base64Images[0]];
        } else {
          newValues = [...value, ...base64Images].slice(0, maxFiles);
        }

        onChange(newValues);
      } catch (error) {
        console.error("Error reading files", error);
      } finally {
        setIsUploading(false);
      }
    },
    [maxFiles, onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxFiles,
  });

  const removeImage = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>

      {value.length > 0 && maxFiles === 1 ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black/40 group">
          <Image
            src={value[0]}
            alt="Preview"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => removeImage(0, e)}
              className="p-2 bg-black/80 rounded-full hover:bg-black text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full min-h-[120px] rounded-xl border-2 border-dashed transition-colors cursor-pointer",
            isDragActive
              ? "border-primary/50 bg-primary/5"
              : "border-white/10 bg-black/20 hover:bg-black/40",
            value.length === 0 && "aspect-video"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center text-center p-4">
            <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm">Drop the files here ...</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/80">Click to upload</span> or drag and drop
              </p>
            )}
            {isUploading && (
              <p className="text-xs text-primary mt-2">Processing...</p>
            )}
          </div>
        </div>
      )}

      {value.length > 0 && maxFiles > 1 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {value.map((img, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-lg group">
              <Image src={img} alt={`Upload ${idx}`} fill className="object-cover" />
              <button
                onClick={(e) => removeImage(idx, e)}
                className="absolute top-1 right-1 p-1 bg-black/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {value.length < maxFiles && (
            <div
              {...getRootProps()}
              className="relative aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-black/20 cursor-pointer hover:bg-black/40 transition-colors"
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
