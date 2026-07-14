import { Button } from "@/components/ui/button";
import { InlineTooltip } from "@/components/ui/tooltip";
import { POSTHOG_EVENTS } from "@/features/posthog/posthog-events";
import { upfetch } from "@/lib/up-fetch";
import {
  Copy,
  Download,
  GitBranch,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { toast } from "sonner";

export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return mimeToExt[mimeType] ?? "png";
}

function getProxiedImageUrl(imageUrl: string) {
  return `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}

async function getImageBlob(imageUrl: string) {
  const response = await upfetch<Response>(getProxiedImageUrl(imageUrl), {
    parseResponse: (rawResponse) => rawResponse,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch image");
  }

  return response.blob();
}

export async function downloadImage(imageUrl: string, baseName: string) {
  try {
    const blob = await getImageBlob(imageUrl);
    const extension = getExtensionFromMimeType(blob.type);
    const timestamp = Date.now();
    const filename = `${baseName}-${timestamp}.${extension}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    toast.error("Failed to download image");
  }
}

export async function copyImageToClipboard(imageUrl: string) {
  const blob = await getImageBlob(imageUrl);
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  toast.success("Copied to clipboard!");
}

type ThumbnailActionsProps = {
  imageUrl: string;
  thumbnailId: string;
  onEdit?: () => void;
  showEdit?: boolean;
  onBranch?: () => void;
  isBranching?: boolean;
  onAddToVideo?: () => void;
  isAddingToVideo?: boolean;
  onSocialMediaSet?: () => void;
};

export function ThumbnailActions({
  imageUrl,
  thumbnailId,
  onEdit,
  showEdit = true,
  onBranch,
  isBranching = false,
  onAddToVideo,
  isAddingToVideo = false,
  onSocialMediaSet,
}: ThumbnailActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadImage(imageUrl, `thumbnail-${thumbnailId}`);
      posthog.capture(POSTHOG_EVENTS.THUMBNAIL_DOWNLOADED, {
        thumbnail_id: thumbnailId,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (isCopying) return;
    setIsCopying(true);
    try {
      await copyImageToClipboard(imageUrl);
      posthog.capture(POSTHOG_EVENTS.THUMBNAIL_COPIED, {
        thumbnail_id: thumbnailId,
      });
    } catch {
      toast.error("Failed to copy image");
    } finally {
      setIsCopying(false);
    }
  };

  const tooltipDelay = 500;

  return (
    <div className="flex items-center gap-1">
      {showEdit && onEdit && (
        <InlineTooltip
          title="Edit this thumbnail with AI"
          delayDuration={tooltipDelay}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={onEdit}
          >
            <Pencil className="size-3 text-white" />
          </Button>
        </InlineTooltip>
      )}
      {onBranch && (
        <InlineTooltip
          title="Create a new inspiration from this thumbnail"
          delayDuration={tooltipDelay}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={onBranch}
            disabled={isBranching}
          >
            <GitBranch className="size-3 text-white" />
          </Button>
        </InlineTooltip>
      )}
      {onAddToVideo && (
        <InlineTooltip
          title="Add this thumbnail to a video project"
          delayDuration={tooltipDelay}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={onAddToVideo}
            disabled={isAddingToVideo}
          >
            {isAddingToVideo ? (
              <Loader2 className="size-3 animate-spin text-white" />
            ) : (
              <Plus className="size-3 text-white" />
            )}
          </Button>
        </InlineTooltip>
      )}
      {onSocialMediaSet && (
        <InlineTooltip
          title="Create social media sizes"
          delayDuration={tooltipDelay}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
            onClick={onSocialMediaSet}
            aria-label="Social media set"
          >
            <LayoutGrid className="size-3 text-white" />
          </Button>
        </InlineTooltip>
      )}
      <InlineTooltip
        title="Copy image to clipboard"
        delayDuration={tooltipDelay}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
          onClick={handleCopy}
          disabled={isCopying}
        >
          {isCopying ? (
            <Loader2 className="size-3 animate-spin text-white" />
          ) : (
            <Copy className="size-3 text-white" />
          )}
        </Button>
      </InlineTooltip>
      <InlineTooltip
        title="Download image to your device"
        delayDuration={tooltipDelay}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="size-3 animate-spin text-white" />
          ) : (
            <Download className="size-3 text-white" />
          )}
        </Button>
      </InlineTooltip>
    </div>
  );
}
