import { cn } from "@/lib/utils";
import { useState } from "react";
import { getFallbackThumbnailUrl, getThumbnailUrl } from "./youtube-utils";

export function YoutubeThumbnail({
  videoId,
  className,
}: {
  videoId: string;
  className?: string;
}) {
  const [thumbnail, setThumbnail] = useState({
    videoId,
    src: getThumbnailUrl(videoId),
  });

  if (thumbnail.videoId !== videoId) {
    setThumbnail({ videoId, src: getThumbnailUrl(videoId) });
  }

  return (
    <img
      src={thumbnail.src}
      alt="Video thumbnail"
      className={cn(
        "aspect-video shrink-0 rounded-md border object-cover",
        className,
      )}
      onError={() =>
        setThumbnail({ videoId, src: getFallbackThumbnailUrl(videoId) })
      }
    />
  );
}
