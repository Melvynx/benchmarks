"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload } from "lucide-react";

interface ImageFile {
  file: File;
  preview: string;
  base64: string;
}

interface ImageDropzoneProps {
  label: string;
  multiple?: boolean;
  onChange: (base64Images: string[]) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageDropzone({
  label,
  multiple = false,
  onChange,
}: ImageDropzoneProps) {
  const [files, setFiles] = useState<ImageFile[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles = await Promise.all(
        acceptedFiles.map(async (file) => ({
          file,
          preview: URL.createObjectURL(file),
          base64: await fileToBase64(file),
        }))
      );

      setFiles((prev) => {
        const updated = multiple ? [...prev, ...newFiles] : newFiles;
        onChange(updated.map((f) => f.base64));
        return updated;
      });
    },
    [multiple, onChange]
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept } =
    useDropzone({
      onDrop,
      accept: { "image/*": [] },
      multiple,
    });

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      const updated = prev.filter((_, i) => i !== index);
      onChange(updated.map((f) => f.base64));
      return updated;
    });
  };

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>

      <div
        {...getRootProps()}
        className={`
          relative min-h-[90px] rounded-lg border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-2 p-3 transition-all
          ${isDragActive && isDragAccept ? "border-primary bg-primary/10" : ""}
          ${isDragActive && !isDragAccept ? "border-destructive bg-destructive/10" : ""}
          ${!isDragActive ? "border-border hover:border-muted-foreground/50 hover:bg-muted/30" : ""}
        `}
      >
        <input {...getInputProps()} />

        {files.length === 0 ? (
          <>
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground text-center">
              {isDragActive ? "Drop here" : "Drag & drop or click"}
            </span>
          </>
        ) : (
          <div className="flex flex-wrap gap-2 w-full">
            {files.map((f, i) => (
              <div key={i} className="relative group">
                <img
                  src={f.preview}
                  alt=""
                  className="w-16 h-16 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
            {multiple && (
              <div className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center">
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
