"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type GeneratedImage = {
  data: string;
  mediaType: string;
};

type ThumbnailGridProps = {
  images: GeneratedImage[];
  isLoading: boolean;
  count: number;
};

function downloadImage(data: string, mediaType: string, index: number) {
  const ext = mediaType.split("/")[1] || "png";
  const link = document.createElement("a");
  link.href = `data:${mediaType};base64,${data}`;
  link.download = `thumbnail-${index + 1}.${ext}`;
  link.click();
}

export function ThumbnailGrid({ images, isLoading, count }: ThumbnailGridProps) {
  if (!isLoading && images.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Generated Thumbnails
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading
          ? Array.from({ length: count }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-video w-full rounded-lg"
              />
            ))
          : images.map((img, i) => (
              <div
                key={i}
                className="group relative rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={`data:${img.mediaType};base64,${img.data}`}
                  alt={`Thumbnail ${i + 1}`}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => downloadImage(img.data, img.mediaType, i)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
