"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ThumbnailGridProps {
  images: { data: string; mediaType: string }[];
}

export function ThumbnailGrid({ images }: ThumbnailGridProps) {
  const downloadImage = (base64Data: string, mediaType: string, index: number) => {
    const link = document.createElement("a");
    link.href = base64Data;
    link.download = `thumbnail-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {images.map((img, index) => (
        <Card key={index} className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={img.data}
                alt={`Generated thumbnail ${index + 1}`}
                className="w-full aspect-video object-cover"
              />
              <div className="absolute bottom-2 right-2">
                <Button
                  size="sm"
                  onClick={() => downloadImage(img.data, img.mediaType, index)}
                  className="bg-primary/90 hover:bg-primary"
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
