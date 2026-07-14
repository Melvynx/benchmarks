"use client";

import { X } from "lucide-react";
import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PreviewItem = { file: File; url: string };

type ImageUploadZoneProps = {
  label: string;
  description?: string;
  multiple?: boolean;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  items: PreviewItem[];
  onChange: (items: PreviewItem[]) => void;
  className?: string;
};

const defaultAccept = { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] };

export function ImageUploadZone({
  label,
  description,
  multiple = false,
  maxFiles = 8,
  accept = defaultAccept,
  items,
  onChange,
  className,
}: ImageUploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        toast.error("Some files were rejected. Use images only.");
      }
      const cap = multiple ? maxFiles : 1;
      const next = multiple ? [...items] : [];
      for (const file of accepted) {
        if (next.length >= cap) break;
        const url = URL.createObjectURL(file);
        next.push({ file, url });
      }
      if (!multiple && accepted.length > 0) {
        for (const old of items) URL.revokeObjectURL(old.url);
        onChange(next.slice(-1));
        return;
      }
      onChange(next);
    },
    [items, maxFiles, multiple, onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles: multiple ? maxFiles : 1,
    noClick: true,
    noKeyboard: true,
  });

  const removeAt = useCallback(
    (index: number) => {
      const copy = [...items];
      const [removed] = copy.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      onChange(copy);
    },
    [items, onChange]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-0.5">
        <Label className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        {description ? (
          <p className="text-[11px] text-muted-foreground/80">{description}</p>
        ) : null}
      </div>
      <div
        {...getRootProps()}
        className={cn(
          "relative min-h-[140px] rounded-xl border border-dashed border-border/60 bg-muted/20 transition-colors",
          isDragActive && "border-primary/50 bg-primary/5"
        )}
      >
        <input {...getInputProps()} />
        {items.length === 0 ? (
          <button
            type="button"
            onClick={open}
            className="flex h-full min-h-[140px] w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center outline-none"
          >
            <span className="text-xs text-muted-foreground">
              Drop images here or{" "}
              <span className="text-foreground underline decoration-muted-foreground/50 underline-offset-2">
                browse
              </span>
            </span>
          </button>
        ) : (
          <div className="flex flex-wrap gap-2 p-3">
            {items.map((item, i) => (
              <div
                key={`${item.url}-${i}`}
                className="group relative size-24 overflow-hidden rounded-lg border border-border/40 bg-background"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- blob preview URLs */}
                <img
                  src={item.url}
                  alt=""
                  className="size-full object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  className="absolute right-1 top-1 size-6 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i);
                  }}
                  aria-label="Remove image"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))}
            {multiple && items.length < maxFiles ? (
              <button
                type="button"
                onClick={open}
                className="flex size-24 items-center justify-center rounded-lg border border-dashed border-border/50 text-[10px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/30"
              >
                + Add
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
