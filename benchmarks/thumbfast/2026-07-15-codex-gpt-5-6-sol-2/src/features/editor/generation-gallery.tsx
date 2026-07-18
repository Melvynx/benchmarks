import { Button } from "@/components/ui/button";
import { InlineTooltip } from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth-client";
import { getModelLabel } from "@/lib/ai/image-models";
import { getAspectRatioClass } from "@/lib/ai/aspect-ratio";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ExternalLink,
  Hourglass,
  Loader2,
  RotateCcw,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Link from "@/compat/link";
import Image from "@/compat/image";
import { useEffect, useState } from "react";
import type { GenerationWithThumbnails, ThumbnailData } from "./editor.query";
import { makeFunctionReference } from "convex/server";
import { useMutation as useConvexMutation } from "convex/react";
import { ThumbnailActions } from "./thumbnail-actions";
import { ThumbnailDetailDialog } from "./thumbnail-detail-dialog";
import { FormattedPromptText } from "./formatted-prompt-text";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { toast } from "sonner";

const ESTIMATED_GENERATION_MS = 25000;
const deleteGenerationRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; generationId: string },
  { id: string }
>("editor:deleteGeneration");
const toggleThumbnailStarRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; thumbnailId: string },
  { id: string; isStarred: boolean }
>("editor:toggleThumbnailStar");
const deleteThumbnailRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; thumbnailId: string },
  { id: string }
>("editor:deleteThumbnail");

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

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

function useElapsedSeconds(startTime: Date | string | null | undefined) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return startTime ? seconds : 0;
}

function openImagePreviewDialog(imageUrl: string) {
  dialogManager.custom({
    title: "Reference image",
    size: "xl",
    children: (
      <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-lg">
        <Image
          src={imageUrl}
          alt="Reference image"
          fill
          sizes="100vw"
          className="object-contain"
        />
      </div>
    ),
  });
}

type GenerationGalleryProps = {
  orgSlug: string;
  generations: GenerationWithThumbnails[];
  onEdit?: (imageUrl: string, thumbnailId: string) => void;
  onLoadPrompt?: (promptText: string) => void;
  onReuse?: (generation: GenerationWithThumbnails) => void;
  onCancelGeneration?: (generationId: string) => void;
  onBranch?: (
    thumbnailId: string,
    imageUrl: string,
    personIds: string[],
  ) => void;
  branchingThumbnailId?: string | null;
  onAddToVideo?: (thumbnailId: string) => void;
  onSocialMediaSet?: (
    thumbnailId: string,
    imageUrl: string,
    generation: GenerationWithThumbnails,
  ) => void;
  onDataChange?: () => void;
};

export function GenerationGallery({
  orgSlug,
  generations,
  onEdit,
  onLoadPrompt,
  onReuse,
  onCancelGeneration,
  onBranch,
  branchingThumbnailId,
  onAddToVideo,
  onSocialMediaSet,
  onDataChange,
}: GenerationGalleryProps) {
  const session = useSession();
  const isAdmin = session.data?.user.role === "admin";
  const [selectedThumbnail, setSelectedThumbnail] = useState<{
    thumbnail: ThumbnailData;
    generation: GenerationWithThumbnails;
  } | null>(null);

  if (generations.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center rounded-lg border border-dashed text-sm">
        No generated thumbnails yet. Click "Generate" to create thumbnails.
      </div>
    );
  }

  const groupedByDate = groupGenerationsByDate(generations);

  return (
    <div className="flex flex-col gap-8">
      {Object.entries(groupedByDate).map(([date, dateGenerations]) => (
        <div key={date} className="flex flex-col gap-4">
          <h3 className="text-muted-foreground text-sm font-medium">{date}</h3>
          <div className="flex flex-col gap-6">
            {dateGenerations.map((generation) => (
              <GenerationRow
                key={generation.id}
                orgSlug={orgSlug}
                generation={generation}
                onEdit={onEdit}
                onLoadPrompt={onLoadPrompt}
                onReuse={onReuse}
                onCancel={onCancelGeneration}
                onAddToVideo={onAddToVideo}
                onSocialMediaSet={onSocialMediaSet}
                onDataChange={onDataChange}
                isAdmin={isAdmin}
                onThumbnailClick={(thumbnail) =>
                  setSelectedThumbnail({ thumbnail, generation })
                }
              />
            ))}
          </div>
        </div>
      ))}
      <ThumbnailDetailDialog
        open={selectedThumbnail !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedThumbnail(null);
        }}
        thumbnail={selectedThumbnail?.thumbnail ?? null}
        generation={selectedThumbnail?.generation ?? null}
        onEdit={onEdit}
        onBranch={onBranch}
        isBranching={branchingThumbnailId === selectedThumbnail?.thumbnail.id}
        onAddToVideo={onAddToVideo}
        onReuse={onReuse}
        isAdmin={isAdmin}
      />
    </div>
  );
}

type GenerationRowProps = {
  orgSlug: string;
  generation: GenerationWithThumbnails;
  onEdit?: (imageUrl: string, thumbnailId: string) => void;
  onLoadPrompt?: (promptText: string) => void;
  onReuse?: (generation: GenerationWithThumbnails) => void;
  onCancel?: (generationId: string) => void;
  onAddToVideo?: (thumbnailId: string) => void;
  onSocialMediaSet?: (
    thumbnailId: string,
    imageUrl: string,
    generation: GenerationWithThumbnails,
  ) => void;
  onDataChange?: () => void;
  isAdmin?: boolean;
  onThumbnailClick?: (thumbnail: ThumbnailData) => void;
};

function GenerationRow({
  orgSlug,
  generation,
  onEdit,
  onLoadPrompt,
  onReuse,
  onCancel,
  onAddToVideo,
  onSocialMediaSet,
  onDataChange,
  isAdmin = false,
  onThumbnailClick,
}: GenerationRowProps) {
  const deleteGeneration = useConvexMutation(deleteGenerationRef);
  const allSourceImages = [
    ...generation.personImageUrls,
    ...generation.inspirationUrls,
    ...generation.userImages.map((img) => img.imageUrl),
  ];

  const gridColumns = Math.min(Math.max(generation.thumbnails.length, 1), 4);

  const firstPendingId = generation.thumbnails.find(
    (t) => t.status === "pending",
  )?.id;

  return (
    <div className="group/generation flex flex-col gap-4 lg:flex-row lg:gap-6">
      <div
        className="grid flex-1 gap-2"
        style={{
          gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
        }}
      >
        {generation.thumbnails.map((thumbnail) => {
          if (thumbnail.status === "processing") {
            return (
              <GeneratingPlaceholder
                key={thumbnail.id}
                aspectRatio={generation.aspectRatio}
                claimedAt={thumbnail.claimedAt}
              />
            );
          }

          if (thumbnail.status === "pending") {
            return (
              <PendingPlaceholder
                key={thumbnail.id}
                aspectRatio={generation.aspectRatio}
                createdAt={thumbnail.createdAt}
                showCancel={onCancel && thumbnail.id === firstPendingId}
                onCancel={onCancel ? () => onCancel(generation.id) : undefined}
              />
            );
          }

          return (
            <ThumbnailCard
              key={thumbnail.id}
              orgSlug={orgSlug}
              thumbnail={thumbnail}
              aspectRatio={generation.aspectRatio}
              onEdit={onEdit}
              onAddToVideo={onAddToVideo}
              onSocialMediaSet={
                onSocialMediaSet && thumbnail.imageUrl
                  ? () => {
                      const url = thumbnail.imageUrl;
                      if (url) onSocialMediaSet(thumbnail.id, url, generation);
                    }
                  : undefined
              }
              onDataChange={onDataChange}
              isAdmin={isAdmin}
              onClick={() => onThumbnailClick?.(thumbnail)}
            />
          );
        })}
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 lg:w-72 lg:shrink-0">
        <button
          type="button"
          onClick={() =>
            onLoadPrompt?.(generation.editPrompt ?? generation.textPrompt)
          }
          className="hover:bg-accent line-clamp-6 cursor-pointer rounded p-1 text-left text-sm leading-relaxed transition-colors"
        >
          <FormattedPromptText
            text={generation.editPrompt ?? generation.textPrompt}
          />
        </button>
        {generation.baseImageUrl && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                openImagePreviewDialog(generation.baseImageUrl ?? "")
              }
              className="hover:ring-primary relative size-8 cursor-pointer overflow-hidden rounded border transition-all hover:ring-2"
            >
              <Image
                src={generation.baseImageUrl}
                alt="Base image"
                fill
                sizes="32px"
                className="object-cover"
              />
            </button>
            <span className="text-muted-foreground text-xs">Edited from</span>
          </div>
        )}
        {allSourceImages.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allSourceImages.slice(0, 4).map((url) => (
              <button
                type="button"
                key={url}
                onClick={() => openImagePreviewDialog(url)}
                className="hover:ring-primary relative size-8 cursor-pointer overflow-hidden rounded border transition-all hover:ring-2"
              >
                <Image
                  src={url}
                  alt="Source image"
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              </button>
            ))}
            {allSourceImages.length > 4 && (
              <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded border text-xs">
                +{allSourceImages.length - 4}
              </div>
            )}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover/generation:opacity-100">
          {onReuse && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => onReuse(generation)}
            >
              <RotateCcw className="mr-1.5 size-3" />
              Reuse
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive w-fit"
            onClick={() => {
              dialogManager.confirm({
                title: "Delete generation",
                description:
                  "Are you sure you want to delete this generation and all its thumbnails?",
                variant: "destructive",
                action: {
                  label: "Delete",
                  variant: "destructive",
                  onClick: async () => {
                    await deleteGeneration({
                      orgSlug,
                      generationId: generation.id,
                    });
                    toast.success("Generation deleted");
                    onDataChange?.();
                  },
                },
              });
            }}
          >
            <Trash2 className="mr-1.5 size-3" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

type ThumbnailCardProps = {
  orgSlug: string;
  thumbnail: ThumbnailData;
  aspectRatio?: string;
  onEdit?: (imageUrl: string, thumbnailId: string) => void;
  onAddToVideo?: (thumbnailId: string) => void;
  onSocialMediaSet?: () => void;
  onDataChange?: () => void;
  isAdmin?: boolean;
  onClick?: () => void;
};

function ThumbnailCard({
  orgSlug,
  thumbnail,
  aspectRatio,
  onEdit,
  onAddToVideo,
  onSocialMediaSet,
  onDataChange,
  isAdmin = false,
  onClick,
}: ThumbnailCardProps) {
  const toggleThumbnailStar = useConvexMutation(toggleThumbnailStarRef);
  const deleteThumbnail = useConvexMutation(deleteThumbnailRef);
  const modelLabel = getModelLabel(thumbnail.model);
  const [isStarred, setIsStarred] = useState(thumbnail.isStarred);
  const [isStarring, setIsStarring] = useState(false);

  const timeLabel = thumbnail.generationTimeMs
    ? `${(thumbnail.generationTimeMs / 1000).toFixed(1)}s`
    : null;
  const providerLabel = isAdmin
    ? formatProviderLabel(thumbnail.routingFinalProvider)
    : null;

  if (thumbnail.error) {
    const isAiPolicyError = thumbnail.error.includes("[AI Policy]");
    return (
      <div
        className={cn(
          "bg-destructive/10 border-destructive/30 group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border p-3",
          getAspectRatioClass(aspectRatio),
        )}
      >
        <AlertTriangle className="text-destructive size-6" />
        <p className="text-destructive text-center text-xs leading-tight">
          {thumbnail.error}
        </p>
        {isAiPolicyError && (
          <Link
            href="/docs/guides/bypass-ai-policy"
            target="_blank"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs underline transition-colors"
          >
            Learn how to fix this
            <ExternalLink className="size-3" />
          </Link>
        )}
      </div>
    );
  }

  if (!thumbnail.imageUrl) {
    return (
      <div
        className={cn(
          "bg-muted group relative flex items-center justify-center overflow-hidden rounded-lg border",
          getAspectRatioClass(aspectRatio),
        )}
      >
        <span className="text-muted-foreground text-sm">No image</span>
      </div>
    );
  }

  const imageUrl = thumbnail.imageUrl;

  const handleToggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStarring) return;
    setIsStarring(true);
    setIsStarred(!isStarred);
    try {
      const result = await toggleThumbnailStar({
        orgSlug,
        thumbnailId: thumbnail.id,
      });
      setIsStarred(result.isStarred);
    } catch {
      setIsStarred(isStarred);
      toast.error("Failed to update star");
    } finally {
      setIsStarring(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dialogManager.confirm({
      title: "Delete thumbnail",
      description: "Are you sure you want to delete this thumbnail?",
      variant: "destructive",
      action: {
        label: "Delete",
        variant: "destructive",
        onClick: async () => {
          await deleteThumbnail({ orgSlug, thumbnailId: thumbnail.id });
          toast.success("Thumbnail deleted");
          onDataChange?.();
        },
      },
    });
  };

  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-lg border",
        getAspectRatioClass(aspectRatio),
      )}
      onClick={onClick}
    >
      <Image
        src={imageUrl}
        alt="Generated thumbnail"
        fill
        sizes="(max-width: 768px) 50vw, 25vw"
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
        <div
          className="pointer-events-auto flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <InlineTooltip
            title={isStarred ? "Remove from favorites" : "Add to favorites"}
            delayDuration={500}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={handleToggleStar}
              disabled={isStarring}
            >
              <Star
                className={`size-3 ${isStarred ? "fill-yellow-400 text-yellow-400" : "text-white"}`}
              />
            </Button>
          </InlineTooltip>
          <InlineTooltip title="Delete thumbnail" delayDuration={500}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 bg-white/20 backdrop-blur-sm hover:bg-red-500/50"
              onClick={handleDelete}
            >
              <Trash2 className="size-3 text-white" />
            </Button>
          </InlineTooltip>
        </div>
        <div className="flex items-end justify-between">
          {(modelLabel || timeLabel || providerLabel) && (
            <div className="flex flex-col gap-0.5 text-xs text-white">
              {modelLabel && <span className="font-medium">{modelLabel}</span>}
              {timeLabel && <span className="text-white/70">{timeLabel}</span>}
              {providerLabel && (
                <span className="text-white/70">via {providerLabel}</span>
              )}
            </div>
          )}
          <div
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ThumbnailActions
              imageUrl={imageUrl}
              thumbnailId={thumbnail.id}
              onEdit={onEdit ? () => onEdit(imageUrl, thumbnail.id) : undefined}
              showEdit={!!onEdit}
              onAddToVideo={
                onAddToVideo ? () => onAddToVideo(thumbnail.id) : undefined
              }
              onSocialMediaSet={onSocialMediaSet}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function GeneratingPlaceholder({
  aspectRatio,
  claimedAt,
}: {
  aspectRatio?: string;
  claimedAt?: Date | string | null;
}) {
  const [progress, setProgress] = useState(0);
  const elapsed = useElapsedSeconds(claimedAt ?? new Date());

  useEffect(() => {
    const startTime = claimedAt ? new Date(claimedAt).getTime() : Date.now();
    const tick = () => {
      const ms = Date.now() - startTime;
      const raw = (ms / ESTIMATED_GENERATION_MS) * 90;
      setProgress(Math.min(Math.max(raw, 0), 90));
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [claimedAt]);

  return (
    <div
      className={cn(
        "bg-muted relative overflow-hidden rounded-lg border",
        getAspectRatioClass(aspectRatio),
      )}
    >
      <div
        className="absolute inset-y-0 left-0 bg-red-500/20 transition-[width] duration-150 ease-linear"
        style={{ width: `${progress}%` }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
        <span className="text-foreground text-sm font-medium tabular-nums">
          {formatElapsed(elapsed)}
        </span>
      </div>
    </div>
  );
}

function PendingPlaceholder({
  aspectRatio,
  createdAt,
  showCancel,
  onCancel,
}: {
  aspectRatio?: string;
  createdAt?: Date | string | null;
  showCancel?: boolean;
  onCancel?: () => void;
}) {
  const elapsed = useElapsedSeconds(createdAt ?? null);

  return (
    <div
      className={cn(
        "bg-muted group relative overflow-hidden rounded-lg border",
        getAspectRatioClass(aspectRatio),
      )}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <Hourglass className="text-muted-foreground size-8" />
        {createdAt && (
          <span className="text-muted-foreground text-xs tabular-nums">
            Queued · {formatElapsed(elapsed)}
          </span>
        )}
      </div>
      {showCancel && onCancel && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="absolute right-2 bottom-2 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onCancel}
        >
          <X className="mr-1 size-3" />
          Cancel
        </Button>
      )}
    </div>
  );
}

function groupGenerationsByDate(
  generations: GenerationWithThumbnails[],
): Record<string, GenerationWithThumbnails[]> {
  const grouped: Record<string, GenerationWithThumbnails[]> = {};

  for (const generation of generations) {
    const date = new Date(generation.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    grouped[date] = grouped[date] ?? [];
    grouped[date].push(generation);
  }

  return grouped;
}
