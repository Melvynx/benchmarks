"use client";

import { Download, Maximize2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

export interface GeneratedThumbnail {
  id: string;
  dataUrl: string;
  prompt: string;
}

interface ThumbnailCardProps {
  thumbnail: GeneratedThumbnail;
  index: number;
  onOpen: (t: GeneratedThumbnail) => void;
}

export function ThumbnailCard({ thumbnail, index, onOpen }: ThumbnailCardProps) {
  const download = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const link = document.createElement("a");
      link.href = thumbnail.dataUrl;
      link.download = `thumbnail-${Date.now()}-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div
      className="group relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg cursor-pointer animate-in"
      onClick={() => onOpen(thumbnail)}
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <Image
        src={thumbnail.dataUrl}
        alt="Generated thumbnail"
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(thumbnail);
          }}
          className="flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-black transition-colors"
        >
          <Maximize2 className="size-3" />
          View
        </button>
        <button
          type="button"
          onClick={download}
          className="flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-sm px-3 py-1.5 text-xs font-semibold text-black hover:bg-white transition-colors"
        >
          <Download className="size-3" />
          Download
        </button>
      </div>
    </div>
  );
}

export function ThumbnailSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="aspect-video w-full rounded-xl shimmer border border-border animate-in"
      style={{ animationDelay: `${index * 70}ms` }}
    />
  );
}
