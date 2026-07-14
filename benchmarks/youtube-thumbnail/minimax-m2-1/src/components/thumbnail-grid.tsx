"use client";

import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ThumbnailGridProps {
  images: Array<{ data: string; mediaType: string }>;
  isLoading: boolean;
  onRegenerate: () => void;
}

export function ThumbnailGrid({ images, isLoading, onRegenerate }: ThumbnailGridProps) {
  const downloadImage = (data: string, index: number) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${data}`;
    link.download = `thumbnail-${index + 1}.png`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="aspect-video animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="aspect-video rounded-xl border-2 border-dashed border-border flex items-center justify-center">
        <p className="text-muted-foreground">Generated thumbnails will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length} thumbnail{images.length !== 1 ? "s" : ""} generated
        </p>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerate
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <Card key={index} className="overflow-hidden group">
            <div className="relative aspect-video">
              <img
                src={`data:${image.mediaType};base64,${image.data}`}
                alt={`Generated thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => downloadImage(image.data, index)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
