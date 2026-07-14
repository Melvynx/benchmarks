"use client";

import { Download } from "lucide-react";
import { Button } from "./ui/button";

interface ThumbnailCardProps {
  id: string;
  base64: string;
  mimeType: string;
}

export function ThumbnailCard({ id, base64, mimeType }: ThumbnailCardProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `data:${mimeType};base64,${base64}`;
    link.download = `thumbnail-${id.slice(0, 8)}.${mimeType.split("/")[1]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="group relative rounded-lg overflow-hidden bg-muted">
      <img
        src={`data:${mimeType};base64,${base64}`}
        alt="Generated thumbnail"
        className="w-full aspect-video object-cover"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button variant="secondary" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </div>
  );
}
