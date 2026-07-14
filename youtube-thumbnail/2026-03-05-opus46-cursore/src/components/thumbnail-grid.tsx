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
  loading: boolean;
  count: number;
};

function downloadImage(data: string, mediaType: string, index: number) {
  const ext = mediaType.split("/")[1] || "png";
  const link = document.createElement("a");
  link.href = `data:${mediaType};base64,${data}`;
  link.download = `thumbnail-${index + 1}.${ext}`;
  link.click();
}

export function ThumbnailGrid({ images, loading, count }: ThumbnailGridProps) {
  if (!loading && images.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {loading
        ? Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="aspect-video w-full rounded-xl" />
          ))
        : images.map((img, i) => (
            <div
              key={i}
              className="group relative overflow-hidden rounded-xl border border-border"
            >
              <img
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={`Generated thumbnail ${i + 1}`}
                className="aspect-video w-full object-cover"
              />
              <div className="absolute inset-0 flex items-end justify-end bg-linear-to-t from-black/60 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => downloadImage(img.data, img.mediaType, i)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>
          ))}
    </div>
  );
}
