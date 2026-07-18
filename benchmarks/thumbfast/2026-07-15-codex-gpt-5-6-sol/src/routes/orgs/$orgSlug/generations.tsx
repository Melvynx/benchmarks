import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  type ThumbnailListItem,
  useInfiniteThumbnails,
} from "@/features/editor/editor.query";
import { FormattedPromptText } from "@/features/editor/formatted-prompt-text";
import { ThumbnailActions } from "@/features/editor/thumbnail-actions";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import {
  clearLastSavedVideo,
  getLastSavedVideo,
  setLastSavedVideo,
} from "@/features/video/video-session";
import { VideoSelectorDialog } from "@/features/video/video-selector-dialog";
import { addThumbnailToVideo } from "@/features/video/video.convex";
import { getAspectRatioClass } from "@/lib/ai/aspect-ratio";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { ImageIcon, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const generationColumnOptions = ["1", "2", "3", "4", "5"] as const;
type GenerationColumnCount = (typeof generationColumnOptions)[number];

const generationColumnClassNames: Record<GenerationColumnCount, string> = {
  "1": "grid-cols-1",
  "2": "grid-cols-1 sm:grid-cols-2",
  "3": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  "4": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  "5": "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
};

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
const addThumbnailRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; thumbnailId: string; videoId?: string },
  { videoId: string; videoGenerationId: string }
>("video:addThumbnail");
const removeVideoGenerationRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; videoGenerationId: string },
  { success: boolean }
>("video:removeGeneration");

export const Route = createFileRoute("/orgs/$orgSlug/generations")({
  component: GenerationsRoute,
});

function GenerationsRoute() {
  const { orgSlug } = Route.useParams();
  const [starredFilter, setStarredFilter] = useState(false);
  const [columnCount, setColumnCount] = useQueryState(
    "columns",
    parseAsStringLiteral(generationColumnOptions).withDefault("5").withOptions({
      clearOnDefault: true,
    }),
  );
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
  } = useInfiniteThumbnails(orgSlug, starredFilter ? true : undefined);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const addThumbnailMutation = useConvexMutation(addThumbnailRef);
  const removeVideoGeneration = useConvexMutation(removeVideoGenerationRef);
  const [addingThumbnailId, setAddingThumbnailId] = useState<string | null>(
    null,
  );
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    thumbnailId: string | null;
  }>({ open: false, thumbnailId: null });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const thumbnails = data.pages.flatMap((page) => page.items);

  const undoVideoAddition = useCallback(
    async (videoGenerationId: string) => {
      try {
        await removeVideoGeneration({ orgSlug, videoGenerationId });
        clearLastSavedVideo(orgSlug);
        toast.success("Removed from video");
      } catch {
        toast.error("Failed to undo");
      }
    },
    [orgSlug, removeVideoGeneration],
  );

  const handleAddToVideo = useCallback(
    async (thumbnailId: string) => {
      const lastSaved = getLastSavedVideo(orgSlug);

      if (!lastSaved) {
        setDialogState({ open: true, thumbnailId });
        return;
      }

      setAddingThumbnailId(thumbnailId);
      try {
        const result = await addThumbnailToVideo(
          { orgSlug, thumbnailId, videoId: lastSaved.videoId },
          addThumbnailMutation,
        );

        toast.success(`Added to "${lastSaved.videoTitle}"`, {
          action: {
            label: "Undo",
            onClick: () => void undoVideoAddition(result.videoGenerationId),
          },
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to add to video",
        );
      } finally {
        setAddingThumbnailId(null);
      }
    },
    [addThumbnailMutation, orgSlug, undoVideoAddition],
  );

  const handleDialogSuccess = useCallback(
    (result: {
      videoId: string;
      videoGenerationId: string;
      videoTitle: string;
    }) => {
      setLastSavedVideo(orgSlug, {
        videoId: result.videoId,
        videoTitle: result.videoTitle,
      });

      toast.success(`Added to "${result.videoTitle}"`, {
        action: {
          label: "Undo",
          onClick: () => void undoVideoAddition(result.videoGenerationId),
        },
      });
    },
    [orgSlug, undoVideoAddition],
  );

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Generations</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <Select
          value={columnCount}
          onValueChange={(value) =>
            void setColumnCount(value as GenerationColumnCount)
          }
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue placeholder="Columns" />
          </SelectTrigger>
          <SelectContent>
            {generationColumnOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option} {option === "1" ? "column" : "columns"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={starredFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setStarredFilter((value) => !value)}
          className="gap-1.5"
        >
          <Star className={cn("size-3.5", starredFilter && "fill-current")} />
          Starred
        </Button>
      </LayoutActions>
      <LayoutContent className="flex flex-col gap-6">
        {isLoading ? (
          <div
            className={cn(
              "grid gap-4",
              generationColumnClassNames[columnCount],
            )}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item) => (
              <Skeleton key={item} className="aspect-video w-full rounded-md" />
            ))}
          </div>
        ) : thumbnails.length === 0 ? (
          <EmptyState orgSlug={orgSlug} />
        ) : (
          <>
            <div
              className={cn(
                "grid gap-2",
                generationColumnClassNames[columnCount],
              )}
            >
              {thumbnails.map((thumbnail) => (
                <ThumbnailCard
                  key={thumbnail.id}
                  thumbnail={thumbnail}
                  orgSlug={orgSlug}
                  onAddToVideo={handleAddToVideo}
                  isAddingToVideo={addingThumbnailId === thumbnail.id}
                  onDeleted={refresh}
                />
              ))}
            </div>

            <div ref={loadMoreRef} className="flex justify-center py-4">
              {isFetchingNextPage ? (
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
              ) : null}
            </div>
          </>
        )}
      </LayoutContent>

      {dialogState.thumbnailId ? (
        <VideoSelectorDialog
          open={dialogState.open}
          onOpenChange={(open) => {
            if (!open) setDialogState({ open: false, thumbnailId: null });
          }}
          orgSlug={orgSlug}
          thumbnailId={dialogState.thumbnailId}
          onSuccess={handleDialogSuccess}
        />
      ) : null}
    </Layout>
  );
}

function ThumbnailCard({
  thumbnail,
  orgSlug,
  onAddToVideo,
  isAddingToVideo,
  onDeleted,
}: {
  thumbnail: ThumbnailListItem;
  orgSlug: string;
  onAddToVideo: (thumbnailId: string) => void;
  isAddingToVideo: boolean;
  onDeleted: () => void;
}) {
  const editImageUrl = encodeURIComponent(thumbnail.imageUrl);
  const toggleThumbnailStar = useConvexMutation(toggleThumbnailStarRef);
  const deleteThumbnail = useConvexMutation(deleteThumbnailRef);
  const [isStarred, setIsStarred] = useState(thumbnail.isStarred);
  const [isStarring, setIsStarring] = useState(false);

  useEffect(() => {
    setIsStarred(thumbnail.isStarred);
  }, [thumbnail.isStarred]);

  const handleToggleStar = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isStarring) return;
    setIsStarring(true);
    setIsStarred((value) => !value);

    try {
      const result = await toggleThumbnailStar({
        orgSlug,
        thumbnailId: thumbnail.id,
      });
      setIsStarred(result.isStarred);
    } catch {
      setIsStarred(thumbnail.isStarred);
      toast.error("Failed to update star");
    } finally {
      setIsStarring(false);
    }
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    dialogManager.confirm({
      title: "Delete thumbnail",
      description:
        "Are you sure you want to delete this thumbnail? It will be hidden from your gallery.",
      variant: "destructive",
      action: {
        label: "Delete",
        variant: "destructive",
        onClick: async () => {
          await deleteThumbnail({ orgSlug, thumbnailId: thumbnail.id });
          toast.success("Thumbnail deleted");
          onDeleted();
        },
      },
    });
  };

  return (
    <div
      className={cn(
        "group relative w-full overflow-hidden rounded-md",
        getAspectRatioClass(thumbnail.generation.aspectRatio),
      )}
    >
      <Image
        src={thumbnail.imageUrl}
        alt="Generated thumbnail"
        fill
        className="object-cover transition-transform duration-200 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              onClick={handleToggleStar}
              disabled={isStarring}
            >
              <Star
                className={cn(
                  "size-3",
                  isStarred ? "fill-yellow-400 text-yellow-400" : "text-white",
                )}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 bg-white/20 backdrop-blur-sm hover:bg-red-500/50"
              onClick={handleDelete}
            >
              <Trash2 className="size-3 text-white" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/orgs/${orgSlug}/thumbnails/${thumbnail.generation.promptId}?editImage=${editImageUrl}&editThumbnailId=${thumbnail.id}`}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 bg-white/20 backdrop-blur-sm hover:bg-white/30"
              >
                <Pencil className="size-3 text-white" />
              </Button>
            </Link>
            <ThumbnailActions
              imageUrl={thumbnail.imageUrl}
              thumbnailId={thumbnail.id}
              showEdit={false}
              onAddToVideo={() => onAddToVideo(thumbnail.id)}
              isAddingToVideo={isAddingToVideo}
            />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <p className="line-clamp-2 text-sm font-medium text-white">
            <FormattedPromptText
              variant="onDark"
              text={thumbnail.generation.textPrompt}
            />
          </p>
          <span className="text-xs text-white/70">
            #{thumbnail.generation.generationNumber}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
        <ImageIcon className="text-muted-foreground size-6" />
      </div>
      <h3 className="mb-2 font-semibold">No generations yet</h3>
      <p className="text-muted-foreground mb-4 text-center text-sm">
        Create your first thumbnail to see generations here.
      </p>
      <Link
        href={`/orgs/${orgSlug}/thumbnails/new`}
        className="text-primary text-sm underline"
      >
        Create a thumbnail
      </Link>
    </div>
  );
}
