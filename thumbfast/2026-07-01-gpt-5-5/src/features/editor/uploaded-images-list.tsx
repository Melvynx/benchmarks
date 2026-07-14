import { useFileUpload } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, ImageIcon, Loader, X } from "lucide-react";
import Image from "@/compat/image";
import { useState, useRef, useEffect } from "react";
import type { UserImageData } from "./editor.schema";
import { UserImageDetailDialog } from "./user-image-detail-dialog";

type UploadedImagesListProps = {
  images: UserImageData[];
  onRemove: (imageId: string) => void;
  onEditName?: (imageId: string, name: string) => void;
  disabled?: boolean;
};

export function UploadedImagesList({
  images,
  onRemove,
  onEditName,
  disabled = false,
}: UploadedImagesListProps) {
  const [detailImage, setDetailImage] = useState<UserImageData | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-col gap-1">
        {images.map((image) => (
          <UploadedImageItem
            key={image.id}
            image={image}
            onRemove={onRemove}
            onEditName={onEditName}
            onImageClick={setDetailImage}
            disabled={disabled}
          />
        ))}
      </div>
      <UserImageDetailDialog
        image={detailImage}
        open={detailImage !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDetailImage(null);
        }}
      />
    </>
  );
}

type UploadedImageItemProps = {
  image: UserImageData;
  onRemove: (imageId: string) => void;
  onEditName?: (imageId: string, name: string) => void;
  onImageClick?: (image: UserImageData) => void;
  disabled?: boolean;
};

function UploadedImageItem({
  image,
  onRemove,
  onEditName,
  onImageClick,
  disabled = false,
}: UploadedImageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(image.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (disabled || !onEditName) return;
    setEditValue(image.name);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== image.name) {
      onEditName?.(image.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(image.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg p-2">
      <button
        type="button"
        onClick={() => onImageClick?.(image)}
        className="shrink-0 cursor-pointer"
      >
        <Image
          src={image.imageUrl}
          alt={image.name}
          width={40}
          height={40}
          className="size-10 rounded object-cover transition-opacity hover:opacity-80"
        />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="bg-background h-5 truncate rounded border px-1 text-sm font-medium outline-none focus:ring-1"
          />
        ) : (
          <span
            className={cn(
              "truncate px-1 text-sm font-medium text-amber-400",
              !disabled &&
                onEditName &&
                "hover:bg-accent/50 cursor-pointer rounded",
            )}
            onDoubleClick={handleDoubleClick}
          >
            {image.name}
          </span>
        )}
        <span className="text-muted-foreground truncate px-1 text-xs">
          {image.description ?? "Image reference"}
        </span>
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={() => onRemove(image.id)}
          className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

type UploadedImagesAddButtonProps = {
  onFilesSelected: (files: File[]) => void;
  currentCount: number;
  maxCount: number;
  isUploading?: boolean;
  disabled?: boolean;
};

export function UploadedImagesAddButton({
  onFilesSelected,
  currentCount,
  maxCount,
  isUploading = false,
  disabled = false,
}: UploadedImagesAddButtonProps) {
  const [
    { isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: true,
    accept: "image/png,image/jpeg,image/jpg,image/webp",
    maxSize: 2 * 1024 * 1024,
    onFilesAdded: (addedFiles) => {
      const files = addedFiles
        .map((f) => f.file)
        .filter((f): f is File => f instanceof File);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
  });

  const inputProps = getInputProps();

  if (currentCount >= maxCount) return null;

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-dragging={isDragging || undefined}
      className={cn(
        "rounded-lg transition-colors",
        isDragging && "bg-accent/50 ring-primary ring-2 ring-offset-2",
      )}
    >
      <label
        className={cn(
          "hover:bg-accent/50 flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left transition-colors",
          (isUploading || disabled) && "pointer-events-none opacity-50",
        )}
      >
        <input
          {...inputProps}
          className="sr-only"
          disabled={isUploading || disabled}
        />
        <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded border">
          {isUploading ? (
            <Loader className="size-3.5 animate-spin opacity-60" />
          ) : (
            <ImageIcon className="size-3.5 opacity-60" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {isDragging ? "Drop images here" : "Add Images"}
          </span>
          <span className="text-muted-foreground text-xs">
            {currentCount}/{maxCount} images • Drag & drop or click
          </span>
        </div>
      </label>
      {errors.length > 0 && (
        <div className="text-destructive flex items-center gap-2 px-2 pt-1 text-sm">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
