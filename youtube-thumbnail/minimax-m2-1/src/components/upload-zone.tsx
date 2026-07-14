"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";

interface UploadZoneProps {
  onImagesSelected: (files: string[]) => void;
  maxFiles: number;
  accept?: Record<string, string[]>;
  label: string;
}

export function UploadZone({
  onImagesSelected,
  maxFiles,
  accept = { "image/*": [] },
  label,
}: UploadZoneProps) {
  const [previews, setPreviews] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const base64Files = acceptedFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(base64Files).then((files) => {
        setPreviews((prev) => [...prev, ...files].slice(0, maxFiles));
        onImagesSelected(files);
      });
    },
    [maxFiles, onImagesSelected]
  );

  const removeImage = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - previews.length,
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-4 min-h-[120px] flex flex-col items-center justify-center cursor-pointer transition-all
          ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }
        `}
      >
        <input {...getInputProps()} />
        {previews.length === 0 ? (
          <div className="text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isDragActive ? "Drop images here" : "Click or drag images"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 w-full">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {previews.length < maxFiles && (
              <div className="border-2 border-dashed border-border rounded-lg flex items-center justify-center h-20">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
