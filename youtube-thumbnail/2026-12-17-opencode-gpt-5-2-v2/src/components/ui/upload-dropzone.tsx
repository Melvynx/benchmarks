"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type UploadDropzoneValue = {
  id: string;
  dataUrl: string;
  name: string;
  size: number;
};

type UploadDropzoneProps = {
  title: string;
  subtitle: string;
  description: string;
  multiple?: boolean;
  maxFiles?: number;
  value: UploadDropzoneValue[];
  onChange: (next: UploadDropzoneValue[]) => void;
};

export function UploadDropzone({
  title,
  subtitle,
  description,
  multiple,
  maxFiles,
  value,
  onChange,
}: UploadDropzoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const mapped = await Promise.all(
        acceptedFiles.map(async (file) => {
          const dataUrl = await readAsDataUrl(file);
          return {
            id: crypto.randomUUID(),
            dataUrl,
            name: file.name,
            size: file.size,
          };
        })
      );

      const next = multiple ? [...value, ...mapped] : mapped.slice(0, 1);
      onChange(maxFiles ? next.slice(0, maxFiles) : next);
    },
    [maxFiles, multiple, onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: multiple ?? false,
    maxFiles: maxFiles ?? (multiple ? 6 : 1),
  });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-soft">{subtitle}</p>
        </div>
        <span className="text-xs text-soft">{description}</span>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center transition",
          isDragActive
            ? "border-foreground/60 bg-foreground/5"
            : "border-foreground/15 bg-background/40",
          "hover:border-foreground/40"
        )}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium">
          {isDragActive ? "Drop images here" : "Drag & drop or click to upload"}
        </p>
        <p className="text-xs text-soft">PNG, JPG, or WEBP</p>
      </div>

      {value.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {value.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-xl border border-foreground/10 bg-background/60"
            >
              <img
                src={item.dataUrl}
                alt={item.name}
                className="h-20 w-full object-cover"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 rounded-full opacity-0 transition group-hover:opacity-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(value.filter((file) => file.id !== item.id));
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
