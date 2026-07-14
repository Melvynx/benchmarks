import { AlertCircleIcon, ImageIcon, UploadIcon, XIcon } from "lucide-react";
import Image from "@/compat/image";

import { Button } from "@/components/ui/button";
import {
  formatBytes,
  useFileUpload,
  type FileMetadata,
} from "@/hooks/use-file-upload";
import { useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

export type ImageSize = "sm" | "md" | "lg";

export type MultiImageUploaderProps = {
  images: string[];
  onImagesChange: (images: string[]) => void;
  onUpload: (file: File) => Promise<string>;
  maxImages: number;
  maxSizeMB?: number;
  isUploading?: boolean;
  disabled?: boolean;
  imageSize?: ImageSize;
  compact?: boolean;
  className?: string;
};

const sizeConfig = {
  sm: {
    grid: "grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    minHeight: "min-h-32",
  },
  md: {
    grid: "grid-cols-2 md:grid-cols-3",
    minHeight: "min-h-52",
  },
  lg: {
    grid: "grid-cols-1 md:grid-cols-2",
    minHeight: "min-h-64",
  },
};

const getFilePreview = (file: {
  file: File | { type: string; name: string; url?: string };
}) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type;
  const fileName = file.file instanceof File ? file.file.name : file.file.name;

  const renderImage = (src: string) => (
    <Image
      alt={fileName}
      className="size-full rounded-t-[inherit] object-cover"
      src={src}
      fill
      unoptimized
    />
  );

  return (
    <div className="bg-accent flex aspect-video items-center justify-center overflow-hidden rounded-t-[inherit]">
      {fileType.startsWith("image/") ? (
        file.file instanceof File ? (
          (() => {
            const previewUrl = URL.createObjectURL(file.file);
            return renderImage(previewUrl);
          })()
        ) : (file.file as { url?: string }).url ? (
          renderImage((file.file as { url: string }).url)
        ) : (
          <ImageIcon className="size-5 opacity-60" />
        )
      ) : (
        <ImageIcon className="size-5 opacity-60" />
      )}
    </div>
  );
};

export function MultiImageUploader({
  images,
  onImagesChange,
  onUpload,
  maxImages,
  maxSizeMB = 2,
  isUploading = false,
  disabled = false,
  imageSize = "md",
  compact = false,
  className,
}: MultiImageUploaderProps) {
  const maxSize = maxSizeMB * 1024 * 1024;
  const config = sizeConfig[imageSize];

  const uploadedUrlsRef = useRef<Map<string, string>>(new Map());

  const initialFiles: FileMetadata[] = useMemo(
    () =>
      images.map((url, index) => ({
        id: `image-${index}-${url.slice(-10)}`,
        name: `Image ${index + 1}`,
        size: 0,
        type: "image/jpeg",
        url,
      })),
    [images],
  );

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp",
    initialFiles,
    maxFiles: maxImages,
    maxSize,
    multiple: true,
    onFilesAdded: (addedFiles) => {
      const filesToUpload = addedFiles.filter((f) => f.file instanceof File);

      if (filesToUpload.length === 0) return;

      const uploadPromises = filesToUpload.map(async (fileWithPreview) => {
        const file = fileWithPreview.file as File;
        try {
          const url = await onUpload(file);
          uploadedUrlsRef.current.set(fileWithPreview.id, url);
          return { url, fileId: fileWithPreview.id };
        } catch {
          return null;
        }
      });

      void Promise.all(uploadPromises).then((results) => {
        const successfulUploads = results.filter(
          (r): r is { url: string; fileId: string } => r !== null,
        );
        if (successfulUploads.length > 0) {
          const newUrls = successfulUploads.map((r) => r.url);
          onImagesChange([...images, ...newUrls]);
          successfulUploads.forEach((r) => removeFile(r.fileId));
        }
      });
    },
  });

  const handleRemoveFile = (fileId: string) => {
    const fileToRemove = files.find((f) => f.id === fileId);
    removeFile(fileId);

    let urlToRemove: string | null = null;

    if (fileToRemove) {
      if (fileToRemove.file instanceof File) {
        urlToRemove = uploadedUrlsRef.current.get(fileId) ?? null;
        uploadedUrlsRef.current.delete(fileId);
      } else {
        urlToRemove = (fileToRemove.file as FileMetadata).url;
      }
    }

    if (urlToRemove) {
      onImagesChange(images.filter((url) => url !== urlToRemove));
    }
  };

  const getImageUrl = (file: {
    file: File | { type: string; name: string; url?: string };
  }): string | null => {
    if (file.file instanceof File) {
      return URL.createObjectURL(file.file);
    }
    return (file.file as { url?: string }).url ?? null;
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "border-input data-[dragging=true]:bg-accent/50 rounded-xl border border-dashed p-2 transition-colors",
            className,
          )}
          data-dragging={isDragging || undefined}
          onDragEnter={disabled ? undefined : handleDragEnter}
          onDragLeave={disabled ? undefined : handleDragLeave}
          onDragOver={disabled ? undefined : handleDragOver}
          onDrop={disabled ? undefined : handleDrop}
        >
          <input
            {...getInputProps()}
            aria-label="Upload image file"
            className="sr-only"
            disabled={disabled}
          />
          <div className="flex flex-col gap-1">
            {files.map((file) => {
              const imageUrl = getImageUrl(file);
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-lg p-2"
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={file.file.name}
                      width={32}
                      height={32}
                      className="size-8 shrink-0 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded">
                      <ImageIcon className="text-muted-foreground size-4" />
                    </div>
                  )}
                  <span className="flex-1 truncate text-sm font-medium">
                    {file.file.name}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(file.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {!disabled && files.length < maxImages && (
              <button
                type="button"
                onClick={openFileDialog}
                disabled={isUploading}
                className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded border">
                  <UploadIcon className="size-3.5 opacity-60" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Add Image</span>
                  <span className="text-muted-foreground text-xs">
                    {files.length}/{maxImages} images
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
        {errors.length > 0 && (
          <div
            className="text-destructive flex items-center gap-1 text-xs"
            role="alert"
          >
            <AlertCircleIcon className="size-3 shrink-0" />
            <span>{errors[0]}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "has-[input:focus]:ring-ring/50 border-input has-[input:focus]:border-ring data-[dragging=true]:bg-accent/50 relative flex flex-col items-center overflow-hidden rounded-xl border border-dashed transition-colors not-data-[files]:justify-center has-[input:focus]:ring-[3px]",
          "p-4",
          config.minHeight,
          className,
        )}
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        onDragEnter={disabled ? undefined : handleDragEnter}
        onDragLeave={disabled ? undefined : handleDragLeave}
        onDragOver={disabled ? undefined : handleDragOver}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input
          {...getInputProps()}
          aria-label="Upload image file"
          className="sr-only"
          disabled={disabled}
        />
        {files.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-medium">
                Images ({files.length})
              </h3>
              {!disabled && files.length < maxImages && (
                <Button
                  type="button"
                  onClick={openFileDialog}
                  size="sm"
                  variant="outline"
                  disabled={isUploading || disabled}
                >
                  <UploadIcon
                    aria-hidden="true"
                    className="-ms-0.5 size-3.5 opacity-60"
                  />
                  Add images
                </Button>
              )}
            </div>

            <div className={cn("grid gap-4", config.grid)}>
              {files.map((file) => (
                <div
                  className="bg-background relative flex flex-col rounded-md border"
                  key={file.id}
                >
                  {getFilePreview(file)}
                  {!disabled && (
                    <Button
                      type="button"
                      aria-label="Remove image"
                      className="border-background focus-visible:border-background absolute -top-2 -right-2 size-6 rounded-full border-2 shadow-none"
                      onClick={() => handleRemoveFile(file.id)}
                      size="icon"
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5 border-t p-3">
                    <p className="truncate text-[13px] font-medium">
                      {file.file.name}
                    </p>
                    {file.file.size > 0 && (
                      <p className="text-muted-foreground truncate text-xs">
                        {formatBytes(file.file.size)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
            <div
              aria-hidden="true"
              className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
            >
              <ImageIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 text-sm font-medium">Drop your images here</p>
            <p className="text-muted-foreground text-xs">
              Max {maxImages} images ∙ Up to {maxSizeMB}MB
            </p>
            <Button
              type="button"
              className="mt-4"
              onClick={openFileDialog}
              variant="outline"
              disabled={disabled || isUploading}
            >
              <UploadIcon aria-hidden="true" className="-ms-1 opacity-60" />
              Select images
            </Button>
          </div>
        )}
      </div>
      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
