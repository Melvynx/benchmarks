import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  BorderedDialogContent,
  BorderedDialogFooter,
} from "@/components/bordered-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { makeFunctionReference } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Plus, Video } from "lucide-react";
import Image from "@/compat/image";
import { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import {
  addThumbnailToVideo,
  createVideo,
  removeVideoGeneration,
} from "./video.convex";

const listVideosRef = makeFunctionReference<
  "query",
  { orgSlug: string; cursor?: string; limit?: number },
  { items: VideoItem[]; nextCursor?: string }
>("video:list");
const createVideoRef = makeFunctionReference<
  "mutation",
  { orgSlug: string },
  { id: string; internalTitle?: string }
>("video:create");
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

type VideoThumbnailPreview = {
  slot: number | null;
  selectedThumbnail: {
    id: string;
    imageUrl: string | null;
  } | null;
};

type VideoItem = {
  id: string;
  internalTitle: string;
  description: string;
  closedAt: string | null;
  updatedAt: Date;
  _count: {
    generations: number;
  };
  generations: VideoThumbnailPreview[];
};

function hasFilledVideoSlot(generation: VideoThumbnailPreview) {
  return generation.slot != null || Boolean(generation.selectedThumbnail);
}

type VideoSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  thumbnailId: string;
  onSuccess?: (result: {
    videoId: string;
    videoGenerationId: string;
    videoTitle: string;
  }) => void;
};

export function VideoSelectorDialog({
  open,
  onOpenChange,
  orgSlug,
  thumbnailId,
  onSuccess,
}: VideoSelectorDialogProps) {
  const videosResult = useQuery(
    listVideosRef,
    open && orgSlug ? { orgSlug, limit: 20 } : "skip",
  ) as { items: VideoItem[] } | undefined;
  const createVideoMutation = useMutation(createVideoRef);
  const addThumbnailMutation = useMutation(addThumbnailRef);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");

  const videos = videosResult?.items ?? null;
  const isLoading = open && videosResult === undefined;

  useEffect(() => {
    if (!open) {
      setSelectedVideoId(null);
      setSearch("");
    }
  }, [open]);

  const filteredVideos = videos?.filter((video) => {
    const slotCount = video.generations.filter(hasFilledVideoSlot).length;
    if (video.closedAt || slotCount >= 3) return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      video.internalTitle.toLowerCase().includes(searchLower) ||
      video.description.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleAddToVideo = async (videoId: string) => {
    setSelectedVideoId(videoId);
    setIsAdding(true);
    try {
      const result = await addThumbnailToVideo(
        { orgSlug, thumbnailId, videoId },
        addThumbnailMutation,
      );
      const video = videos?.find((v) => v.id === videoId);
      onOpenChange(false);
      onSuccess?.({
        videoId: result.videoId,
        videoGenerationId: result.videoGenerationId,
        videoTitle: video?.internalTitle || video?.description || "Video",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add to video",
      );
    } finally {
      setIsAdding(false);
      setSelectedVideoId(null);
    }
  };

  const handleCreateNewVideo = async () => {
    setIsCreating(true);
    try {
      const video = await createVideo(orgSlug, createVideoMutation);
      const result = await addThumbnailToVideo(
        { orgSlug, thumbnailId, videoId: video.id },
        addThumbnailMutation,
      );
      onOpenChange(false);
      onSuccess?.({
        videoId: result.videoId,
        videoGenerationId: result.videoGenerationId,
        videoTitle: "New video",
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create video",
      );
    } finally {
      setIsCreating(false);
    }
  };

  useHotkeys("n", () => void handleCreateNewVideo(), {
    enabled: open && !isCreating && !isAdding,
    enableOnFormTags: false,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <BorderedDialogContent
        maxWidth="sm:w-xl sm:max-w-xl"
        className="bg-clip-padding p-2 pb-11"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Add to Video</DialogTitle>
          <DialogDescription>
            Select a video to add this thumbnail to
          </DialogDescription>
        </DialogHeader>
        <Command
          shouldFilter={false}
          className="**:data-[slot=command-input-wrapper]:bg-input/50 **:data-[slot=command-input-wrapper]:border-input rounded-none bg-transparent **:data-[slot=command-input]:!h-9 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:!h-9 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border"
        >
          <CommandInput
            placeholder="Search videos..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="no-scrollbar max-h-[60vh] min-h-80 scroll-pt-2 scroll-pb-1.5">
            {isLoading ? (
              <CommandGroup className="!p-0 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="flex h-16 w-full items-center gap-3 rounded-md px-3"
                  >
                    <Skeleton className="aspect-video h-12 shrink-0 rounded" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-2/5" />
                    </div>
                  </div>
                ))}
              </CommandGroup>
            ) : (
              <CommandEmpty className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
                <Video className="text-muted-foreground/50 size-10" />
                <span>No videos found</span>
              </CommandEmpty>
            )}

            {!isLoading && filteredVideos && filteredVideos.length > 0 && (
              <CommandGroup
                heading="Recent videos"
                className="!p-0 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1"
              >
                {filteredVideos.map((video) => {
                  const isSelected = selectedVideoId === video.id;
                  const title =
                    video.internalTitle ||
                    video.description.slice(0, 50) ||
                    "Untitled video";
                  const thumbnails = video.generations
                    .filter((g) => g.selectedThumbnail?.imageUrl)
                    .map((g) => g.selectedThumbnail?.imageUrl)
                    .filter((url): url is string => !!url);
                  const slotCount =
                    video.generations.filter(hasFilledVideoSlot).length;

                  return (
                    <CommandItem
                      key={video.id}
                      value={`${video.id} ${video.internalTitle} ${video.description}`}
                      onSelect={() => void handleAddToVideo(video.id)}
                      disabled={isAdding}
                      className={cn(
                        "data-[selected=true]:border-input data-[selected=true]:bg-input/50 mx-1 mb-1 flex h-16 cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 transition-all",
                        isSelected && isAdding && "opacity-70",
                      )}
                    >
                      <div className="relative aspect-video h-12 shrink-0 overflow-hidden rounded-md border bg-neutral-100 dark:bg-neutral-800">
                        {thumbnails.length > 0 ? (
                          <Image
                            src={thumbnails[0]}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <Video className="text-muted-foreground size-4" />
                          </div>
                        )}
                        {isSelected && isAdding && (
                          <div className="bg-primary/80 absolute inset-0 flex items-center justify-center">
                            <Loader2 className="text-primary-foreground size-4 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
                          {title}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {video._count.generations} generation
                          {video._count.generations !== 1 ? "s" : ""}
                          {slotCount > 0 && (
                            <span className="text-muted-foreground/60">
                              {" "}
                              · {slotCount}/3 slots
                            </span>
                          )}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
        <BorderedDialogFooter>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Kbd className="size-5">↵</Kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Kbd className="size-5 text-[10px]">Esc</Kbd>
              <span>Close</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline-filled"
            onClick={() => void handleCreateNewVideo()}
            disabled={isCreating || isAdding}
          >
            {isCreating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            New video
            <Kbd className="ml-1">N</Kbd>
          </Button>
        </BorderedDialogFooter>
      </BorderedDialogContent>
    </Dialog>
  );
}

export function useAddToVideo(orgSlug: string) {
  const removeVideoGenerationMutation = useMutation(removeVideoGenerationRef);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    thumbnailId: string | null;
  }>({ open: false, thumbnailId: null });

  const openDialog = (thumbnailId: string) => {
    setDialogState({ open: true, thumbnailId });
  };

  const closeDialog = () => {
    setDialogState({ open: false, thumbnailId: null });
  };

  const handleSuccess = (result: {
    videoId: string;
    videoGenerationId: string;
    videoTitle: string;
  }) => {
    toast.success(`Added to "${result.videoTitle}"`, {
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            await removeVideoGeneration(
              {
                orgSlug,
                videoGenerationId: result.videoGenerationId,
              },
              removeVideoGenerationMutation,
            );
            toast.success("Removed from video");
          } catch {
            toast.error("Failed to undo");
          }
        },
      },
    });
  };

  return {
    dialogState,
    openDialog,
    closeDialog,
    handleSuccess,
  };
}
