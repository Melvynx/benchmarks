"use client";

import { XIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { fileToDataUrl, type UploadedImage } from "@/lib/files";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

type ImageDropzoneProps = {
  id: string;
  label: string;
  description: string;
  images: UploadedImage[];
  multiple?: boolean;
  maxFiles: number;
  onChange: (images: UploadedImage[]) => void;
  disabled?: boolean;
};

export function ImageDropzone({
  id,
  label,
  description,
  images,
  multiple = false,
  maxFiles,
  onChange,
  disabled = false,
}: ImageDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/gif": [],
    },
    multiple,
    maxFiles,
    maxSize: MAX_FILE_BYTES,
    disabled,
    onDrop: async (acceptedFiles, rejections) => {
      if (rejections.length > 0) {
        const message = rejections[0]?.errors[0]?.message ?? "That file cannot be used.";
        toast.error(message);
      }

      if (acceptedFiles.length === 0) return;

      try {
        const converted = await Promise.all(
          acceptedFiles.map(async (file) => ({
            id: crypto.randomUUID(),
            name: file.name,
            dataUrl: await fileToDataUrl(file),
          })),
        );
        const next = multiple
          ? [...images, ...converted].slice(0, maxFiles)
          : converted.slice(0, 1);

        if (multiple && images.length + converted.length > maxFiles) {
          toast.error(`Only ${maxFiles} images fit in ${label.toLowerCase()}.`);
        }

        onChange(next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not read that image.");
      }
    },
  });

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div
        {...getRootProps({
          className: cn(
            "flex min-h-36 cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-input bg-card p-3 transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            isDragActive && "border-ring bg-accent",
            disabled && "pointer-events-none opacity-50",
          ),
        })}
      >
        <input {...getInputProps({ id })} />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop to upload"
            : multiple
              ? "Drop images or click to upload"
              : "Drop an image or click to upload"}
        </p>
        {images.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {images.map((image) => (
              <li key={image.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="aspect-video w-full rounded-md object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  className="absolute top-1 right-1"
                  aria-label={`Remove ${image.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(images.filter((item) => item.id !== image.id));
                  }}
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <FieldDescription>{description}</FieldDescription>
    </Field>
  );
}
