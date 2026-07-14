"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImageUploadProps {
  title: string;
  description: string;
  acceptMultiple?: boolean;
  images: string[];
  setImages: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({
  title,
  description,
  acceptMultiple = false,
  images,
  setImages,
  maxImages = 10,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(newImages).then((base64Images) => {
      if (acceptMultiple) {
        setImages([...images, ...base64Images.slice(0, maxImages - images.length)]);
      } else {
        setImages(base64Images.slice(0, 1));
      }
    });
  }, [acceptMultiple, images, maxImages, setImages]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    multiple: acceptMultiple,
    maxFiles: acceptMultiple ? maxImages : 1,
  });

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-4 cursor-pointer
            transition-all duration-200
            ${isDragActive || dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"}
          `}
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
        >
          <input {...getInputProps()} className="opacity-0 w-full" />

          <div className="text-center">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
            {isDragActive && (
              <p className="text-sm text-primary mt-2">Drop files here...</p>
            )}
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-16 object-cover rounded-md"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600
                             text-white rounded-md p-1 opacity-0 group-hover:opacity-100
                             transition-opacity"
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
