"use client";

import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface GeneratedImage {
  data: string;
  mediaType: string;
}

interface ThumbnailDisplayProps {
  images: GeneratedImage[];
  isLoading: boolean;
  count: number;
  onRegenerate?: () => void;
}

export function ThumbnailDisplay({
  images,
  isLoading,
  count,
  onRegenerate,
}: ThumbnailDisplayProps) {
  const handleDownload = (image: GeneratedImage, index: number) => {
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Generating...</h3>
        </div>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(count, 2)}, 1fr)`,
          }}
        >
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Generated Thumbnails ({images.length})
        </h3>
        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </Button>
        )}
      </div>

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.min(images.length, 2)}, 1fr)`,
        }}
      >
        {images.map((image, index) => (
          <div key={index} className="group space-y-2">
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted">
              <img
                src={`data:${image.mediaType};base64,${image.data}`}
                alt={`Generated thumbnail ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full gap-2"
              onClick={() => handleDownload(image, index)}
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
