"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

type ThumbnailCardProps = {
  src: string;
  label: string;
  onDownload: () => void;
};

export function ThumbnailCard({ src, label, onDownload }: ThumbnailCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-foreground/10 bg-background/70 p-3 backdrop-blur">
      <div className="overflow-hidden rounded-2xl">
        <img
          src={src}
          alt={label}
          className="aspect-video w-full object-cover transition duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.32em] text-soft">
          {label}
        </p>
        <Button
          variant="secondary"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={onDownload}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
