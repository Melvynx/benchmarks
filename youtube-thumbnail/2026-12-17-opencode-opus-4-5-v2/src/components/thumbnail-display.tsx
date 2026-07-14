"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface GeneratedImage {
  data: string;
  mediaType: string;
}

interface ThumbnailDisplayProps {
  images: GeneratedImage[];
  isLoading?: boolean;
  count?: number;
}

export function ThumbnailDisplay({
  images,
  isLoading = false,
  count = 1,
}: ThumbnailDisplayProps) {
  const downloadImage = (image: GeneratedImage, index: number) => {
    const extension = image.mediaType.split("/")[1] || "png";
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoading && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="w-24 h-16 bg-muted rounded-lg mb-4 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm">Your generated thumbnails will appear here</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <div className="flex justify-end">
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {images.map((image, index) => (
        <div
          key={index}
          className="group relative bg-card rounded-lg overflow-hidden border border-border"
        >
          <div className="aspect-video">
            <img
              src={`data:${image.mediaType};base64,${image.data}`}
              alt={`Generated thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3 flex justify-between items-center bg-card">
            <span className="text-sm text-muted-foreground">
              Thumbnail {index + 1}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadImage(image, index)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
