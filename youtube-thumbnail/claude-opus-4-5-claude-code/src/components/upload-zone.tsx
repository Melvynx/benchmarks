"use client";

import { Upload, X, Plus } from "lucide-react";
import { useFileUpload, UploadedFile } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface UploadZoneProps {
  label: string;
  description: string;
  multiple?: boolean;
  maxFiles?: number;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
}

export function UploadZone({
  label,
  description,
  multiple = false,
  maxFiles = 1,
  files,
  onFilesChange,
}: UploadZoneProps) {
  const {
    isDragging,
    error,
    inputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop: internalHandleDrop,
    openFilePicker,
    handleInputChange: internalHandleInputChange,
  } = useFileUpload({ multiple, maxFiles });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      const newFiles = await processFiles(Array.from(e.dataTransfer.files));
      if (multiple) {
        onFilesChange([...files, ...newFiles].slice(0, maxFiles));
      } else {
        onFilesChange(newFiles.slice(0, 1));
      }
    }
    internalHandleDrop(e);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = await processFiles(Array.from(e.target.files));
      if (multiple) {
        onFilesChange([...files, ...newFiles].slice(0, maxFiles));
      } else {
        onFilesChange(newFiles.slice(0, 1));
      }
      e.target.value = "";
    }
  };

  const processFiles = async (fileList: File[]): Promise<UploadedFile[]> => {
    const processed: UploadedFile[] = [];
    for (const file of fileList) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await fileToBase64(file);
      processed.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        base64,
      });
    }
    return processed;
  };

  const removeFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file) URL.revokeObjectURL(file.preview);
    onFilesChange(files.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {files.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {files.length}/{maxFiles}
          </span>
        )}
      </div>

      {files.length === 0 ? (
        <div
          onClick={openFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
            "hover:border-primary/50 hover:bg-muted/30",
            isDragging && "border-primary bg-primary/5"
          )}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {files.map((file) => (
            <div key={file.id} className="relative aspect-video group">
              <img
                src={file.preview}
                alt={file.file.name}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => removeFile(file.id)}
                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
          {multiple && files.length < maxFiles && (
            <button
              onClick={openFilePicker}
              className="aspect-video border-2 border-dashed rounded-lg flex items-center justify-center hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Plus className="h-6 w-6 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
