import { YoutubeThumbnail } from "@/features/inspiration/youtube-thumbnail";
import { upfetch } from "@/lib/up-fetch";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { z } from "zod";

const YoutubeVideoInfoSchema = z.object({
  title: z.string(),
  channelTitle: z.string(),
});

export function VideoPreviewCard({
  videoId,
  onAutoGenerate,
}: {
  videoId: string;
  onAutoGenerate: () => void;
}) {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const videoInfo = useQuery({
    queryKey: ["youtube-video-info", videoId],
    queryFn: async () =>
      upfetch("/api/tools/youtube-video-info", {
        params: { url: watchUrl },
        schema: YoutubeVideoInfoSchema,
      }),
    staleTime: Infinity,
  });

  return (
    <div className="bg-muted/30 mt-3 flex items-center gap-3 rounded-xl border p-3">
      <YoutubeThumbnail videoId={videoId} className="w-32 rounded-lg" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium">
          {videoInfo.data?.title ?? "YouTube video detected"}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {videoInfo.data?.channelTitle ??
            "Ready for automatic thumbnail generation"}
        </p>
      </div>
      <button
        type="button"
        onClick={onAutoGenerate}
        className="bg-primary text-primary-foreground flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium shadow-sm transition-opacity hover:opacity-90"
      >
        <Zap className="size-3.5" />
        Auto-generate
      </button>
    </div>
  );
}
