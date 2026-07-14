import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { upfetch } from "@/lib/up-fetch";
import { toPng } from "html-to-image";
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Download,
  Loader2,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CardHistory, useCardHistory } from "./card-history";
import {
  CardThemeSchema,
  DEFAULT_VIDEO_DATA,
  LIGHT_THEME,
  STORAGE_KEY_THEME,
  STORAGE_KEY_VIDEO_DATA,
  VideoDataSchema,
  type CardTheme,
  type HistoryEntry,
  type VideoData,
} from "./card.types";
import { CustomizationPanel } from "./customization-panel";
import { VideoCard } from "./video-card";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (/^[\w-]{11}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
}

async function exportPng(node: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(node, {
    pixelRatio: 3,
    cacheBust: true,
  });
  const res = await fetch(dataUrl);
  return res.blob();
}

async function capturePreview(node: HTMLElement): Promise<string> {
  return toPng(node, {
    pixelRatio: 0.5,
    cacheBust: true,
    quality: 0.6,
  });
}

function loadSaved<T>(
  key: string,
  schema: typeof VideoDataSchema | typeof CardThemeSchema,
  fallback: T,
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? (result.data as T) : fallback;
  } catch {
    return fallback;
  }
}

export function VideoCardGenerator() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [videoData, setVideoData] = useState<VideoData>(() =>
    loadSaved(STORAGE_KEY_VIDEO_DATA, VideoDataSchema, DEFAULT_VIDEO_DATA),
  );
  const [theme, setTheme] = useState<CardTheme>(() =>
    loadSaved(STORAGE_KEY_THEME, CardThemeSchema, LIGHT_THEME),
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIDEO_DATA, JSON.stringify(videoData));
  }, [videoData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(theme));
  }, [theme]);

  const { history, addEntry, removeEntry, clearHistory } = useCardHistory();

  const handleFetchVideo = useCallback(async () => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }

    setIsFetching(true);
    try {
      const data = await upfetch("/api/tools/youtube-video-info", {
        params: { url },
      });
      setVideoData((prev) => ({
        ...prev,
        title: data.title ?? prev.title,
        channelTitle: data.channelTitle ?? prev.channelTitle,
        channelAvatarUrl: data.channelAvatarUrl ?? prev.channelAvatarUrl,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      }));
      toast.success("Video data loaded");
    } catch {
      setVideoData((prev) => ({
        ...prev,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      }));
      toast.success("Thumbnail loaded");
    } finally {
      setIsFetching(false);
    }
  }, [url]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const blob = await exportPng(cardRef.current);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${videoData.title.slice(0, 50).replace(/[^\w\s-]/g, "")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      const preview = await capturePreview(cardRef.current);
      addEntry(videoData, theme, preview);
      toast.success("Download started");
    } catch {
      toast.error("Failed to generate image");
    } finally {
      setIsDownloading(false);
    }
  }, [videoData, theme, addEntry]);

  const handleCopy = useCallback(async () => {
    if (!cardRef.current) return;
    setIsCopying(true);
    try {
      const blob = await exportPng(cardRef.current);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      const preview = await capturePreview(cardRef.current);
      addEntry(videoData, theme, preview);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Image copied to clipboard");
    } catch {
      toast.error("Failed to copy image");
    } finally {
      setIsCopying(false);
    }
  }, [videoData, theme, addEntry]);

  const handleRestore = useCallback((entry: HistoryEntry) => {
    setVideoData(entry.videoData);
    setTheme(entry.theme);
    toast.success("Card restored from history");
  }, []);

  const isExporting = isDownloading || isCopying;

  return (
    <div className="flex flex-col gap-8">
      {/* URL Input */}
      <div className="mx-auto w-full max-w-2xl">
        <div className="bg-background flex items-center gap-0 rounded-2xl border p-2 shadow-lg shadow-black/5">
          <input
            type="text"
            placeholder="Paste any YouTube URL to auto-fill..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleFetchVideo();
            }}
            className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent px-4 py-3 text-base outline-none sm:text-lg"
          />
          <Button
            onClick={() => void handleFetchVideo()}
            disabled={!url.trim() || isFetching}
            size="lg"
            className="shrink-0 rounded-xl px-6 text-base font-semibold"
          >
            {isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {isFetching ? "Loading..." : "Load"}
          </Button>
        </div>
        <p className="text-muted-foreground/60 mt-3 text-center text-sm">
          Or customize all fields manually below
        </p>
      </div>

      {/* Editor */}
      <div className="flex flex-col-reverse gap-6 md:flex-row md:gap-8">
        {/* Left: Controls */}
        <Card className="w-full shrink-0 p-4 md:w-80 lg:w-96">
          <CustomizationPanel
            videoData={videoData}
            theme={theme}
            onVideoDataChange={setVideoData}
            onThemeChange={setTheme}
          />
        </Card>

        {/* Right: Preview + Actions */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Preview */}
          <div
            className="flex items-start justify-center overflow-auto rounded-xl border p-4 sm:p-6"
            style={{
              background: "#eee",
              backgroundImage:
                "linear-gradient(45deg, rgba(0,0,0,.25) 25%, transparent 0, transparent 75%, rgba(0,0,0,.25) 0), linear-gradient(45deg, rgba(0,0,0,.25) 25%, transparent 0, transparent 75%, rgba(0,0,0,.25) 0)",
              backgroundPosition: "0 0, 12px 12px",
              backgroundSize: "24px 24px",
            }}
          >
            <div ref={cardRef}>
              <VideoCard videoData={videoData} theme={theme} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => void handleDownload()}
              disabled={isExporting}
            >
              {isDownloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {isDownloading ? "Generating..." : "Download PNG"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void handleCopy()}
              disabled={isExporting}
            >
              {isCopying ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isCopied ? (
                <Check className="size-4 text-green-500" />
              ) : (
                <ClipboardCopy className="size-4" />
              )}
              {isCopying ? "Copying..." : isCopied ? "Copied" : "Copy Image"}
            </Button>
          </div>

          {/* Thumbnail URL field */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">
              Thumbnail URL
            </label>
            <div className="bg-background flex items-center gap-2 rounded-lg border px-3 py-2">
              <Video className="text-muted-foreground size-3.5 shrink-0" />
              <input
                type="text"
                value={videoData.thumbnailUrl}
                onChange={(e) =>
                  setVideoData({ ...videoData, thumbnailUrl: e.target.value })
                }
                placeholder="https://i.ytimg.com/vi/..."
                className="placeholder:text-muted-foreground/40 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <CardHistory
        history={history}
        onRestore={handleRestore}
        onRemove={removeEntry}
        onClear={clearHistory}
      />
    </div>
  );
}
