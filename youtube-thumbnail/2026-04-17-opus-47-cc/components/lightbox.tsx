"use client";

import { X, Download } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { toast } from "sonner";
import type { GeneratedThumbnail } from "./thumbnail-card";

interface LightboxProps {
  thumbnail: GeneratedThumbnail | null;
  onClose: () => void;
}

export function Lightbox({ thumbnail, onClose }: LightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (thumbnail) {
      document.addEventListener("keydown", handler);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [thumbnail, onClose]);

  if (!thumbnail) return null;

  const download = () => {
    try {
      const link = document.createElement("a");
      link.href = thumbnail.dataUrl;
      link.download = `thumbnail-${Date.now()}.png`;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8 animate-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>

      <div
        className="relative w-full max-w-6xl aspect-video"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={thumbnail.dataUrl}
          alt="Thumbnail preview"
          fill
          unoptimized
          sizes="100vw"
          className="object-contain rounded-xl"
          priority
        />
      </div>

      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={download}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-colors shadow-xl"
        >
          <Download className="size-4" />
          Download PNG
        </button>
      </div>
    </div>
  );
}
