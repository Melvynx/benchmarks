"use client";

import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ThumbnailCardProps {
  image: {
    data: string;
    mediaType: string;
  };
}

export function ThumbnailCard({ image }: ThumbnailCardProps) {
  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = `data:${image.mediaType};base64,${image.data}`;
    link.download = `thumbnail-${Date.now()}.${image.mediaType.split("/")[1]}`;
    link.click();
  };

  return (
    <Card className="overflow-hidden group relative">
      <img
        src={`data:${image.mediaType};base64,${image.data}`}
        alt="Generated thumbnail"
        className="w-full aspect-video object-cover"
      />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button onClick={downloadImage} variant="secondary" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
    </Card>
  );
}
