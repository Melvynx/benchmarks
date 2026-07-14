"use client";

import Image from "next/image";
import { ImagePlus, Trash2, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadAsset = {
  id: string;
  name: string;
  size: number;
  mediaType: string;
  dataUrl: string;
};

type UploadDropzoneProps = {
  title: string;
  description: string;
  multiple?: boolean;
  files: UploadAsset[];
  onDropFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
};

export function UploadDropzone({
  title,
  description,
  multiple = false,
  files,
  onDropFiles,
  onRemove,
}: UploadDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "image/*": [] },
    multiple,
    noClick: true,
    onDrop: onDropFiles,
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm uppercase tracking-[0.28em] text-muted-foreground">
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "group relative rounded-[1.75rem] border border-dashed p-5 transition-all",
          "bg-black/4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] dark:bg-white/3",
          isDragActive
            ? "border-amber-300/70 bg-amber-200/10 ring-2 ring-amber-200/20"
            : "border-black/10 hover:border-black/20 dark:border-white/10 dark:hover:border-white/20",
        )}
      >
        <input {...getInputProps()} />

        <div className="flex min-h-36 flex-col justify-between gap-6">
          <div className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-black/10 bg-white/80 text-black shadow-sm dark:border-white/10 dark:bg-white/8 dark:text-white">
              {isDragActive ? (
                <UploadCloud className="size-5" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </div>

            <div className="space-y-1">
              <p className="text-base font-medium text-foreground">
                {isDragActive ? "Drop images here" : "Drag images into the frame"}
              </p>
              <p className="text-sm text-muted-foreground">
                PNG, JPG, WebP. {multiple ? "Add as many as you want." : "One image only."}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-fit rounded-full px-4"
            onClick={open}
          >
            Choose file{multiple ? "s" : ""}
          </Button>
        </div>
      </div>

      {files.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative overflow-hidden rounded-[1.25rem] border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5"
            >
              <div className="relative aspect-16/10">
                <Image
                  src={file.dataUrl}
                  alt={file.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-black/10 px-3 py-3 dark:border-white/10">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  onClick={() => onRemove(file.id)}
                  aria-label={`Remove ${file.name}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
