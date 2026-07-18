import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "@/compat/image";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import {
  useInfiniteVideos,
  type VideoListItem,
} from "@/features/video/video.query";
import { useMutation } from "@/hooks/use-async-mutation";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation as useConvexMutation } from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  CheckCircle2,
  ImageIcon,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Video,
} from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const videoFilterOptions = ["all", "finished", "unfinished"] as const;

type VideoFilter = (typeof videoFilterOptions)[number];

const createVideoRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    youtubeUrl?: string;
    description?: string;
    internalTitle?: string;
    generationIds?: string[];
  },
  { id: string; internalTitle: string }
>("video:create");

const deleteVideoRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; videoId: string },
  { success: boolean }
>("video:remove");

const setVideoClosedRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; videoId: string; closed: boolean },
  { id: string; closedAt: string | null }
>("video:setClosed");

export const Route = createFileRoute("/orgs/$orgSlug/videos/")({
  component: VideosRoute,
});

function VideosRoute() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate();
  const createVideo = useConvexMutation(createVideoRef);
  const [filter, setFilter] = useQueryState(
    "filter",
    parseAsStringLiteral(videoFilterOptions).withDefault("all").withOptions({
      clearOnDefault: true,
    }),
  );
  const [refreshNonce, setRefreshNonce] = useState(0);
  const finishedFilter = filter === "all" ? undefined : filter === "finished";
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refresh,
  } = useInfiniteVideos(orgSlug, finishedFilter, refreshNonce);
  const videos = data.pages.flatMap((page) => page.items);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  const createMutation = useMutation({
    mutationFn: async () => createVideo({ orgSlug }),
    onSuccess: async (video) => {
      toast.success("Video created");
      await navigate({
        to: `/orgs/${orgSlug}/videos/${video.id}` as never,
      });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreateVideo = () => {
    void createMutation.mutateAsync();
  };

  const handleListChanged = () => {
    setRefreshNonce((current) => current + 1);
    void refresh();
  };

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Videos</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <Tabs
          value={filter}
          onValueChange={(value) => void setFilter(value as VideoFilter)}
        >
          <TabsList>
            {videoFilterOptions.map((option) => (
              <TabsTrigger key={option} value={option}>
                {option === "all"
                  ? "All"
                  : option === "finished"
                    ? "Finished"
                    : "Unfinished"}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button onClick={handleCreateVideo}>
          <Plus className="mr-2 size-4" />
          New Video
        </Button>
      </LayoutActions>
      <LayoutContent>
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-video w-full rounded-md" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <EmptyState onAddClick={handleCreateVideo} filter={filter} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  orgSlug={orgSlug}
                  onDeleted={handleListChanged}
                  onStatusChanged={handleListChanged}
                />
              ))}
            </div>
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isFetchingNextPage ? (
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
              ) : hasNextPage ? (
                <Button variant="outline" onClick={() => void fetchNextPage()}>
                  Load more
                </Button>
              ) : null}
            </div>
          </>
        )}
      </LayoutContent>
    </Layout>
  );
}

function VideoCard({
  video,
  orgSlug,
  onDeleted,
  onStatusChanged,
}: {
  video: VideoListItem;
  orgSlug: string;
  onDeleted: () => void;
  onStatusChanged: () => void;
}) {
  const deleteVideo = useConvexMutation(deleteVideoRef);
  const setVideoClosed = useConvexMutation(setVideoClosedRef);
  const isClosed = Boolean(video.closedAt);
  const deleteMutation = useMutation({
    mutationFn: async () => deleteVideo({ orgSlug, videoId: video.id }),
    onSuccess: async () => {
      toast.success("Video deleted");
      onDeleted();
    },
    onError: (error) => toast.error(error.message),
  });
  const closedMutation = useMutation({
    mutationFn: async (closed: boolean) =>
      setVideoClosed({ orgSlug, videoId: video.id, closed }),
    onSuccess: (_, closed) => {
      toast.success(closed ? "Video marked as finished" : "Video reopened");
      onStatusChanged();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleDelete = () => {
    dialogManager.confirm({
      title: "Delete video",
      description: `Are you sure you want to delete "${video.internalTitle || "Untitled video"}"? This action cannot be undone.`,
      variant: "destructive",
      action: {
        label: "Delete",
        variant: "destructive",
        onClick: async () => {
          await deleteMutation.mutateAsync();
        },
      },
    });
  };

  const handleToggleFinished = () => {
    void closedMutation.mutateAsync(!isClosed);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group hover:ring-primary/50 relative overflow-hidden rounded-2xl border shadow-md transition-all hover:shadow-xl hover:ring-2">
          <Link
            to="/orgs/$orgSlug/videos/$videoId"
            params={{ orgSlug, videoId: video.id }}
            className="block"
          >
            <div className="relative aspect-video">
              <div className="grid size-full grid-cols-3 gap-0.5 p-0.5">
                {[1, 2, 3].map((slot) => {
                  const slotData = video.generations.find(
                    (generation) => generation.slot === slot,
                  );
                  const imageUrl = slotData?.selectedThumbnail?.imageUrl;

                  return (
                    <div
                      key={slot}
                      className="bg-muted relative overflow-hidden"
                    >
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={`Slot ${slot}`}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImageIcon className="text-muted-foreground size-6" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Link>
          {isClosed ? (
            <div className="absolute top-2 left-2 z-10">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="size-3" />
                Finished
              </Badge>
            </div>
          ) : null}
          <div className="absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="size-7"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <MoreVertical className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link
                    to="/orgs/$orgSlug/videos/$videoId"
                    params={{ orgSlug, videoId: video.id }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleToggleFinished}>
          {isClosed ? (
            <RotateCcw className="mr-2 size-4" />
          ) : (
            <CheckCircle2 className="mr-2 size-4" />
          )}
          {isClosed ? "Reopen" : "Mark as finished"}
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <Link
            to="/orgs/$orgSlug/videos/$videoId"
            params={{ orgSlug, videoId: video.id }}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Link>
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function EmptyState({
  onAddClick,
  filter,
}: {
  onAddClick: () => void;
  filter: VideoFilter;
}) {
  const title =
    filter === "all"
      ? "No videos yet"
      : filter === "finished"
        ? "No finished videos"
        : "No unfinished videos";
  const description =
    filter === "all"
      ? "Create a video to organize thumbnails and generate title suggestions."
      : filter === "finished"
        ? "Finished videos will appear here after you mark them done."
        : "Create a video to organize thumbnails and generate title suggestions.";

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
      <div className="bg-muted mb-4 flex size-12 items-center justify-center rounded-full">
        <Video className="text-muted-foreground size-6" />
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-muted-foreground mb-4 text-center text-sm">
        {description}
      </p>
      <Button onClick={onAddClick}>
        <Plus className="mr-2 size-4" />
        New Video
      </Button>
    </div>
  );
}
