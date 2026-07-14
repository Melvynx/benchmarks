"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X, Upload } from "lucide-react";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  label: string;
  maxImages?: number;
}

export function ImageUpload({ images, onImagesChange, label, maxImages = 4 }: ImageUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      Promise.all(
        acceptedFiles.map((file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
        )
      ).then((base64Images) => {
        onImagesChange([...images, ...base64Images].slice(0, maxImages));
      });
    },
    [images, onImagesChange, maxImages]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: maxImages - images.length,
    disabled: images.length >= maxImages,
  });

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-400">{label}</label>
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <img src={img} alt={`Uploaded ${idx + 1}`} className="w-full h-24 object-cover rounded-md" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 p-1 bg-black/70 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-white bg-white/10" : "border-zinc-700 hover:border-zinc-500"}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 mx-auto mb-2 text-zinc-500" />
          <p className="text-sm text-zinc-400">
            {isDragActive ? "Drop images here" : "Drag & drop or click to upload"}
          </p>
        </div>
      )}
    </div>
  );
}
