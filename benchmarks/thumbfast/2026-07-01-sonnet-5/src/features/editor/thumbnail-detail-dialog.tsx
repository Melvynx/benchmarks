import {
  BorderedDialogContent,
  BorderedDialogFooter,
  DialogEscClose,
} from "@/components/bordered-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineTooltip } from "@/components/ui/tooltip";
import { getAspectRatioClass } from "@/lib/ai/aspect-ratio";
import { getModelLabel } from "@/lib/ai/image-models";
import {
  Copy,
  Download,
  GitBranch,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
} from "lucide-react";
import Image from "@/compat/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GenerationWithThumbnails, ThumbnailData } from "./editor.query";
import { copyImageToClipboard, downloadImage } from "./thumbnail-actions";
import { FormattedPromptText } from "./formatted-prompt-text";

function formatProviderLabel(
  provider: string | null | undefined,
): string | null {
  if (!provider) return null;

  const labels: Record<string, string> = {
    apiyi: "APIYI",
    gemini: "Gemini",
    google: "Google",
    openai: "OpenAI",
  };

  return labels[provider] ?? provider;
}

function isEditableShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

type ThumbnailDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thumbnail: ThumbnailData | null;
  generation: GenerationWithThumbnails | null;
  onEdit?: (imageUrl: string, thumbnailId: string) => void;
  onBranch?: (
    thumbnailId: string,
    imageUrl: string,
    personIds: string[],
  ) => void;
  isBranching?: boolean;
  onAddToVideo?: (thumbnailId: string) => void;
  onReuse?: (generation: GenerationWithThumbnails) => void;
  isAdmin?: boolean;
};

export function ThumbnailDetailDialog({
  open,
  onOpenChange,
  thumbnail,
  generation,
  onEdit,
  onBranch,
  isBranching = false,
  onAddToVideo,
  onReuse,
  isAdmin = false,
}: ThumbnailDetailDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isAddingToVideo, setIsAddingToVideo] = useState(false);
  const addToVideoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const imageUrl = thumbnail?.imageUrl ?? null;
  const thumbnailId = thumbnail?.id ?? null;

  const handleDownload = useCallback(async () => {
    if (isDownloading || !imageUrl || !thumbnailId) return;
    setIsDownloading(true);
    try {
      await downloadImage(imageUrl, `thumbnail-${thumbnailId}`);
    } finally {
      setIsDownloading(false);
    }
  }, [imageUrl, isDownloading, thumbnailId]);

  const handleCopy = useCallback(async () => {
    if (isCopying || !imageUrl) return;
    setIsCopying(true);
    try {
      await copyImageToClipboard(imageUrl);
    } finally {
      setIsCopying(false);
    }
  }, [imageUrl, isCopying]);

  const handleEdit = useCallback(() => {
    if (!imageUrl || !thumbnailId || !onEdit) return;
    onOpenChange(false);
    onEdit(imageUrl, thumbnailId);
  }, [imageUrl, onEdit, onOpenChange, thumbnailId]);

  useEffect(() => {
    const ref = addToVideoTimeoutRef;
    return () => {
      if (ref.current) {
        clearTimeout(ref.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !imageUrl) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      if (isEditableShortcutTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "c") {
        event.preventDefault();
        void handleCopy();
      }

      if (key === "d") {
        event.preventDefault();
        void handleDownload();
      }

      if (key === "e" && onEdit && thumbnailId) {
        event.preventDefault();
        handleEdit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleCopy,
    handleDownload,
    handleEdit,
    imageUrl,
    onEdit,
    open,
    thumbnailId,
  ]);

  if (!thumbnail || !imageUrl || !generation) return null;

  const promptText = generation.editPrompt ?? generation.textPrompt;
  const modelLabel = getModelLabel(thumbnail.model);
  const timeLabel = thumbnail.generationTimeMs
    ? `${(thumbnail.generationTimeMs / 1000).toFixed(1)}s`
    : null;
  const providerLabel = isAdmin
    ? formatProviderLabel(thumbnail.routingFinalProvider)
    : null;

  const allSourceImages = [
    ...generation.personImageUrls.map((url) => ({ url, label: "Person" })),
    ...generation.inspirationUrls.map((url) => ({
      url,
      label: "Inspiration",
    })),
    ...generation.userImages.map((img) => ({
      url: img.imageUrl,
      label: img.name || "Upload",
    })),
  ];

  const handleAddToVideo = () => {
    if (isAddingToVideo) return;
    setIsAddingToVideo(true);
    onAddToVideo?.(thumbnail.id);
    addToVideoTimeoutRef.current = setTimeout(() => {
      setIsAddingToVideo(false);
      addToVideoTimeoutRef.current = null;
    }, 1000);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BorderedDialogContent maxWidth="sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Thumbnail Detail</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row">
          <div className="relative min-h-[300px] flex-1 bg-neutral-950 md:min-h-[400px]">
            <Image
              src={imageUrl}
              alt="Generated thumbnail"
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="object-contain"
              priority
            />
          </div>

          <div className="flex w-full flex-col gap-4 border-t p-5 md:w-80 md:border-t-0 md:border-l">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Prompt
              </span>
              <p className="text-sm leading-relaxed">
                <FormattedPromptText text={promptText} />
              </p>
            </div>

            {(modelLabel || timeLabel || providerLabel) && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
                {modelLabel && <span>{modelLabel}</span>}
                {timeLabel && <span>{timeLabel}</span>}
                {providerLabel && <span>via {providerLabel}</span>}
              </div>
            )}

            {generation.baseImageUrl && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Edited from
                </span>
                <div
                  className={`relative ${getAspectRatioClass(generation.aspectRatio)} w-full overflow-hidden rounded-lg border`}
                >
                  <Image
                    src={generation.baseImageUrl}
                    alt="Base image"
                    fill
                    sizes="300px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {allSourceImages.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  References
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {allSourceImages.map((img) => (
                    <InlineTooltip key={img.url} title={img.label}>
                      <div className="relative aspect-square overflow-hidden rounded border">
                        <Image
                          src={img.url}
                          alt={img.label}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    </InlineTooltip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <BorderedDialogFooter>
          <DialogEscClose />
          <div className="flex items-center gap-2">
            {onEdit && (
              <InlineTooltip title="Edit this thumbnail with AI (E)">
                <Button
                  type="button"
                  variant="outline-filled"
                  size="sm"
                  onClick={handleEdit}
                >
                  <Pencil className="size-3" />
                  Edit
                </Button>
              </InlineTooltip>
            )}
            {onBranch && (
              <InlineTooltip title="Create a new inspiration from this thumbnail">
                <Button
                  type="button"
                  variant="outline-filled"
                  size="sm"
                  onClick={() => {
                    handleClose();
                    onBranch(thumbnail.id, imageUrl, generation.personIds);
                  }}
                  disabled={isBranching}
                >
                  <GitBranch className="size-3" />
                  Fork
                </Button>
              </InlineTooltip>
            )}
            {onAddToVideo && (
              <InlineTooltip title="Add this thumbnail to a video project">
                <Button
                  type="button"
                  variant="outline-filled"
                  size="sm"
                  onClick={handleAddToVideo}
                  disabled={isAddingToVideo}
                >
                  {isAddingToVideo ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                  Add to Video
                </Button>
              </InlineTooltip>
            )}
            {onReuse && (
              <InlineTooltip title="Reuse prompt and settings for new generation">
                <Button
                  type="button"
                  variant="outline-filled"
                  size="sm"
                  onClick={() => {
                    handleClose();
                    onReuse(generation);
                  }}
                >
                  <RotateCcw className="size-3" />
                  Reuse
                </Button>
              </InlineTooltip>
            )}
            <InlineTooltip title="Copy image to clipboard (C)">
              <Button
                type="button"
                variant="outline-filled"
                size="sm"
                onClick={handleCopy}
                disabled={isCopying}
              >
                {isCopying ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Copy className="size-3" />
                )}
                Copy
              </Button>
            </InlineTooltip>
            <InlineTooltip title="Download image to your device (D)">
              <Button
                type="button"
                variant="outline-filled"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Download className="size-3" />
                )}
                Download
              </Button>
            </InlineTooltip>
          </div>
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}
