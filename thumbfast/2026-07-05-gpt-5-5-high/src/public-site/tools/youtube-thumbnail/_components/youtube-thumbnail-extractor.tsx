import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Copy,
  Download,
  Link2,
  Loader2,
} from "lucide-react";
import Image from "@/compat/image";
import { useState } from "react";
import { toast } from "sonner";

const THUMBNAIL_SIZES = [
  {
    key: "maxresdefault",
    label: "Max Resolution",
    width: 1280,
    height: 720,
    description: "Best quality (16:9)",
    badge: "HD",
  },
  {
    key: "sddefault",
    label: "Standard",
    width: 640,
    height: 480,
    description: "Standard (4:3)",
    badge: "SD",
  },
  {
    key: "hqdefault",
    label: "High Quality",
    width: 480,
    height: 360,
    description: "High quality (4:3)",
    badge: "HQ",
  },
  {
    key: "mqdefault",
    label: "Medium Quality",
    width: 320,
    height: 180,
    description: "Medium (16:9)",
    badge: "MQ",
  },
  {
    key: "default",
    label: "Default",
    width: 120,
    height: 90,
    description: "Smallest (4:3)",
    badge: "SM",
  },
] as const;

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

function getThumbnailUrl(videoId: string, size: string): string {
  return `https://i.ytimg.com/vi/${videoId}/${size}.jpg`;
}

function ActionButtons({
  url,
  videoId,
  size,
}: {
  url: string;
  videoId: string;
  size: string;
}) {
  const { isCopied: isUrlCopied, copyToClipboard: copyUrl } =
    useCopyToClipboard(2000);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCopyImage = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      toast.success("Image copied to clipboard!");
    } catch {
      toast.error("Failed to copy image");
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${videoId}-${size}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started!");
    } catch {
      toast.error("Failed to download image");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          copyUrl(url);
          toast.success("URL copied!");
        }}
      >
        {isUrlCopied ? (
          <Check className="size-3.5 text-green-500" />
        ) : (
          <Link2 className="size-3.5" />
        )}
        Copy URL
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyImage}
        disabled={isCopying}
      >
        {isCopying ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ClipboardCopy className="size-3.5" />
        )}
        Copy Image
      </Button>
      <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Download className="size-3.5" />
        )}
        Download
      </Button>
    </div>
  );
}

function ThumbnailCard({
  videoId,
  size,
}: {
  videoId: string;
  size: (typeof THUMBNAIL_SIZES)[number];
}) {
  const url = getThumbnailUrl(videoId, size.key);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="bg-card group h-fit overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
      <div className="relative">
        {hasError ? (
          <div className="bg-muted flex aspect-video items-center justify-center">
            <p className="text-muted-foreground text-sm">Not available</p>
          </div>
        ) : (
          <Image
            src={url}
            alt={`YouTube thumbnail ${size.label} (${size.width}x${size.height})`}
            width={size.width}
            height={size.height}
            className="h-auto w-full"
            unoptimized
            onError={() => setHasError(true)}
          />
        )}
      </div>
      <div className="flex flex-col gap-2.5 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {size.badge}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {size.width}x{size.height}
            </span>
          </div>
          <span className="text-muted-foreground text-xs">
            {size.description}
          </span>
        </div>
        {!hasError ? (
          <ActionButtons url={url} videoId={videoId} size={size.key} />
        ) : null}
      </div>
    </div>
  );
}

export function YouTubeThumbnailExtractor() {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = () => {
    setError(null);
    const id = extractVideoId(url);
    if (!id) {
      setError("Invalid YouTube URL. Please enter a valid YouTube video link.");
      setVideoId(null);
      return;
    }
    setVideoId(id);
  };

  const { isCopied: isAllCopied, copyToClipboard: copyAll } =
    useCopyToClipboard(2000);

  const handleCopyAllUrls = () => {
    if (!videoId) return;
    const urls = THUMBNAIL_SIZES.map(
      (size) =>
        `${size.label} (${size.width}x${size.height}): ${getThumbnailUrl(videoId, size.key)}`,
    ).join("\n");
    copyAll(urls);
    toast.success("All thumbnail URLs copied!");
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="bg-background flex items-center gap-0 rounded-2xl border p-2 shadow-lg shadow-black/5">
          <input
            type="text"
            placeholder="Paste any YouTube URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleExtract();
            }}
            className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent px-4 py-3 text-base outline-none sm:text-lg"
          />
          <Button
            onClick={handleExtract}
            disabled={!url.trim()}
            size="lg"
            className="shrink-0 rounded-xl px-6 text-base font-semibold"
          >
            Extract
            <ArrowRight className="size-4" />
          </Button>
        </div>
        {error ? (
          <p className="text-destructive mt-3 text-center text-sm">{error}</p>
        ) : null}
        {!videoId ? (
          <p className="text-muted-foreground/60 mt-3 text-center text-sm">
            Supports youtube.com, youtu.be, embeds, Shorts, and live URLs
          </p>
        ) : null}
      </div>

      {videoId ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Showing thumbnails for{" "}
              <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
                {videoId}
              </code>
            </p>
            <Button variant="outline" size="sm" onClick={handleCopyAllUrls}>
              {isAllCopied ? (
                <Check className="size-3.5 text-green-500" />
              ) : (
                <Copy className="size-3.5" />
              )}
              Copy All URLs
            </Button>
          </div>

          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
            <Image
              src={getThumbnailUrl(videoId, "maxresdefault")}
              alt="YouTube thumbnail Max Resolution (1280x720)"
              width={1280}
              height={720}
              className="h-auto w-full"
              unoptimized
            />
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-[10px]">
                  HD
                </Badge>
                <span className="text-sm font-medium">Max Resolution</span>
                <span className="text-muted-foreground text-xs">1280x720</span>
              </div>
              <ActionButtons
                url={getThumbnailUrl(videoId, "maxresdefault")}
                videoId={videoId}
                size="maxresdefault"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {THUMBNAIL_SIZES.slice(1).map((size) => (
              <ThumbnailCard
                key={`${videoId}-${size.key}`}
                videoId={videoId}
                size={size}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
