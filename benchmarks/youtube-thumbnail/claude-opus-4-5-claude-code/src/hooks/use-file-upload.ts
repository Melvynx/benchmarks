"use client";

import { useState, useCallback, useRef } from "react";

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  base64?: string;
}

interface UseFileUploadOptions {
  maxFiles?: number;
  maxSize?: number;
  accept?: string[];
  multiple?: boolean;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxFiles = 5,
    maxSize = 5 * 1024 * 1024,
    accept = ["image/jpeg", "image/png", "image/webp"],
    multiple = true,
  } = options;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const validateFile = (file: File): string | null => {
    if (!accept.includes(file.type)) {
      return `Invalid file type. Accepted: ${accept.join(", ")}`;
    }
    if (file.size > maxSize) {
      return `File too large. Max size: ${maxSize / 1024 / 1024}MB`;
    }
    return null;
  };

  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(newFiles);

      if (!multiple && fileArray.length > 1) {
        setError("Only one file allowed");
        return;
      }

      const currentCount = multiple ? files.length : 0;
      if (currentCount + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const validFiles: UploadedFile[] = [];
      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        const base64 = await fileToBase64(file);
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          base64,
        });
      }

      if (validFiles.length > 0) {
        setFiles((prev) => (multiple ? [...prev, ...validFiles] : validFiles));
      }
    },
    [files.length, maxFiles, multiple, accept, maxSize]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setError(null);
  }, [files]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
        e.target.value = "";
      }
    },
    [addFiles]
  );

  return {
    files,
    isDragging,
    error,
    inputRef,
    addFiles,
    removeFile,
    clearFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFilePicker,
    handleInputChange,
  };
}
