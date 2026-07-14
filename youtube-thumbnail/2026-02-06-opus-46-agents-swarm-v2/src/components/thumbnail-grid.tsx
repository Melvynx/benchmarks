"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface ThumbnailGridProps {
  images: { data: string; mediaType: string }[];
  isLoading: boolean;
  count: number;
}

export function ThumbnailGrid({ images, isLoading, count }: ThumbnailGridProps) {
  const handleDownload = (image: { data: string; mediaType: string }, index: number) => {
    const a = document.createElement("a");
    a.href = `data:${image.mediaType};base64,${image.data}`;
    a.download = `thumbnail-${index + 1}.png`;
    a.click();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="aspect-video w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {images.map((image, i) => (
        <div key={i} className="relative group rounded-lg overflow-hidden">
          <img
            src={`data:${image.mediaType};base64,${image.data}`}
            alt={`Thumbnail ${i + 1}`}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Button
              size="sm"
              variant="secondary"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => handleDownload(image, i)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
