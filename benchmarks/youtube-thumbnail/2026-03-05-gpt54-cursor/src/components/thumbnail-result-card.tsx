"use client";

import Image from "next/image";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export type GeneratedThumbnail = {
  id: string;
  data: string;
  mediaType: string;
};

type ThumbnailResultCardProps = {
  image: GeneratedThumbnail;
  index: number;
};

export function ThumbnailResultCard({
  image,
  index,
}: ThumbnailResultCardProps) {
  const src = `data:${image.mediaType};base64,${image.data}`;

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `youtube-thumbnail-${index + 1}.${getExtension(image.mediaType)}`;
    link.click();
  };

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-card shadow-[0_24px_80px_-36px_rgba(0,0,0,0.5)] dark:border-white/10">
      <div className="relative aspect-video">
        <Image
          src={src}
          alt={`Generated thumbnail ${index + 1}`}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-black/10 px-4 py-4 dark:border-white/10">
        <div>
          <p className="text-sm font-medium">Thumbnail {index + 1}</p>
          <p className="text-xs text-muted-foreground">
            {image.mediaType.replace("image/", "").toUpperCase()}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="rounded-full"
          onClick={handleDownload}
        >
          <Download className="size-4" />
          Download
        </Button>
      </div>
    </div>
  );
}

function getExtension(mediaType: string) {
  const extension = mediaType.split("/")[1];

  if (!extension) {
    return "png";
  }

  return extension === "jpeg" ? "jpg" : extension;
}
