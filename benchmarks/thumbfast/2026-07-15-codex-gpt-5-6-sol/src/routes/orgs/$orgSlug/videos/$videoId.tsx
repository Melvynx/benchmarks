import { TitleUpdateForm } from "@/components/nowts/title-update-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import {
  useVideo,
  type VideoDetail,
  type VideoGenerationDetail,
} from "@/features/video/video.query";
import Image from "@/compat/image";
import { formatScopedTitle } from "@/lib/metadata";
import { upfetch } from "@/lib/up-fetch";
import { usePageMetadata } from "@/lib/use-page-metadata";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
} from "convex/react";
import { makeFunctionReference } from "convex/server";
import {
  CheckCircle2,
  Download,
  ImageIcon,
  Loader2,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/orgs/$orgSlug/videos/$videoId")({
  component: VideoDetailRoute,
});

const updateVideoRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    videoId: string;
    youtubeUrl?: string;
    description?: string;
    internalTitle?: string;
  },
  { id: string; internalTitle: string }
>("video:update");

const setGenerationSlotRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    videoId: string;
    videoGenerationId: string;
    slot: 1 | 2 | 3 | null;
  },
  { id: string; slot: 1 | 2 | 3 | null }
>("video:setGenerationSlot");

const generateVideoTitlesRef = makeFunctionReference<
  "action",
  { orgSlug: string; videoId: string },
  { success: boolean }
>("video:generateTitles");

const setVideoClosedRef = makeFunctionReference<
  "mutation",
  { orgSlug: string; videoId: string; closed: boolean },
  { id: string; closedAt: string | null }
>("video:setClosed");

function VideoDetailRoute() {
  const { orgSlug, videoId } = Route.useParams();
  const { data: video, isLoading } = useVideo(orgSlug, videoId);
  const currentOrg = useCurrentOrg();
  const updateVideo = useConvexMutation(updateVideoRef);
  const setSlot = useConvexMutation(setGenerationSlotRef);
  const generateVideoTitles = useConvexAction(generateVideoTitlesRef);
  const setVideoClosed = useConvexMutation(setVideoClosedRef);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isUpdatingClosed, setIsUpdatingClosed] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const hasTriggeredTitleGen = useRef(false);

  const slotGenerations = [1, 2, 3].map((slot) =>
    video?.generations.find((generation) => generation.slot === slot),
  );
  const filledSlots = slotGenerations.filter(
    (generation) => generation?.selectedThumbnail?.imageUrl,
  );
  const hasAllSlotsFilled = filledSlots.length === 3;
  const hasAnySlotFilled = filledSlots.length > 0;
  const hasExistingTitles = slotGenerations.some(
    (generation) => generation?.titles && generation.titles.length > 0,
  );
  const proposedTitles =
    slotGenerations
      .find((generation) => (generation?.titles.length ?? 0) > 0)
      ?.titles.map((title) => title.text)
      .slice(0, 3) ?? [];

  usePageMetadata(
    video
      ? {
          title: formatScopedTitle([
            video.internalTitle || "Video",
            currentOrg?.name ?? orgSlug,
          ]),
          description: video.description || "Video thumbnail workflow.",
          image: getVideoPreviewImage(video),
          path: `/orgs/${orgSlug}/videos/${videoId}`,
          noIndex: true,
        }
      : null,
  );

  useEffect(() => {
    if (!hasAllSlotsFilled) {
      hasTriggeredTitleGen.current = false;
      return;
    }

    if (!hasExistingTitles && !hasTriggeredTitleGen.current && video) {
      hasTriggeredTitleGen.current = true;
      setIsGeneratingTitle(true);
      generateVideoTitles({ orgSlug, videoId: video.id })
        .catch((error) => {
          toast.error(
            error instanceof Error ? error.message : "Failed to generate title",
          );
        })
        .finally(() => setIsGeneratingTitle(false));
    }
  }, [
    generateVideoTitles,
    hasAllSlotsFilled,
    hasExistingTitles,
    orgSlug,
    video,
    videoId,
  ]);

  if (isLoading) {
    return (
      <Layout size="lg">
        <LayoutHeader>
          <Skeleton className="h-8 w-48" />
        </LayoutHeader>
        <LayoutContent>
          <Skeleton className="h-64 w-full" />
        </LayoutContent>
      </Layout>
    );
  }

  if (!video) {
    return (
      <Layout size="lg">
        <LayoutHeader>
          <LayoutTitle>Video not found</LayoutTitle>
        </LayoutHeader>
        <LayoutContent>
          <p className="text-muted-foreground">
            This video doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link to="/orgs/$orgSlug/videos" params={{ orgSlug }}>
            <Button variant="outline" className="mt-4">
              Back to Videos
            </Button>
          </Link>
        </LayoutContent>
      </Layout>
    );
  }

  const saveTitle = async (internalTitle: string) => {
    try {
      await updateVideo({
        orgSlug,
        videoId,
        internalTitle,
      });
      toast.success("Title updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const clearSlot = async (videoGenerationId: string) => {
    try {
      await setSlot({
        orgSlug,
        videoId,
        videoGenerationId,
        slot: null,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update slot",
      );
    }
  };

  const regenerateTitle = async () => {
    if (!hasAllSlotsFilled) return;
    setIsGeneratingTitle(true);
    try {
      await generateVideoTitles({ orgSlug, videoId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate title",
      );
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const toggleFinished = async () => {
    setIsUpdatingClosed(true);
    try {
      await setVideoClosed({
        orgSlug,
        videoId,
        closed: !video.closedAt,
      });
      toast.success(
        video.closedAt ? "Video reopened" : "Video marked as finished",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update video",
      );
    } finally {
      setIsUpdatingClosed(false);
    }
  };

  const exportThumbnails = async () => {
    if (!hasAnySlotFilled) return;
    setIsExporting(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const folderName =
        (video.internalTitle || "")
          .trim()
          .slice(0, 50)
          .replace(/[/\\?%*:|"<>]/g, "-") || `video-${video.id}`;
      const folder = zip.folder(folderName);
      if (!folder) throw new Error("Failed to create zip folder");

      await Promise.all(
        slotGenerations.map(async (generation, index) => {
          const imageUrl = generation?.selectedThumbnail?.imageUrl;
          if (!imageUrl) return;
          const response = await upfetch<Response>(
            `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`,
            { parseResponse: (rawResponse) => rawResponse },
          );
          if (!response.ok) {
            throw new Error(`Failed to fetch thumbnail ${index + 1}`);
          }
          const blob = await response.blob();
          const rawExtension = blob.type.split("/")[1]?.split(";")[0];
          const extension =
            rawExtension &&
            ["png", "jpeg", "jpg", "webp"].includes(rawExtension)
              ? rawExtension
              : "png";
          folder.file(`thumbnail-${index + 1}.${extension}`, blob);
        }),
      );

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${folderName}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Thumbnails exported");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export thumbnails",
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Layout size="lg">
      <LayoutHeader>
        <div className="flex flex-wrap items-center gap-3">
          <TitleUpdateForm
            title={video.internalTitle || "Untitled"}
            onUpdate={saveTitle}
          />
          {video.closedAt ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="size-3" />
              Finished
            </Badge>
          ) : null}
        </div>
      </LayoutHeader>
      <LayoutActions>
        <Button
          variant="outline"
          onClick={() => void toggleFinished()}
          disabled={isUpdatingClosed}
        >
          {isUpdatingClosed ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : video.closedAt ? (
            <RotateCcw className="mr-2 size-4" />
          ) : (
            <CheckCircle2 className="mr-2 size-4" />
          )}
          {video.closedAt ? "Reopen" : "Mark finished"}
        </Button>
        <Button
          variant="outline"
          onClick={() => void exportThumbnails()}
          disabled={!hasAnySlotFilled || isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          Export
        </Button>
      </LayoutActions>
      <LayoutContent>
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight">
                  YouTube previews
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isGeneratingTitle ? (
                  <Badge variant="secondary" className="gap-1.5">
                    <Loader2 className="size-3 animate-spin" />
                    Generating titles
                  </Badge>
                ) : proposedTitles.length > 0 ? (
                  <Badge variant="outline">
                    {proposedTitles.length} proposed titles
                  </Badge>
                ) : null}
                {hasAllSlotsFilled ? (
                  <Button
                    variant="outline"
                    onClick={() => void regenerateTitle()}
                    disabled={isGeneratingTitle}
                  >
                    <RefreshCw className="mr-2 size-4" />
                    Regenerate titles
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
              {slotGenerations.map((generation, index) => (
                <YoutubeGridPreviewCard
                  key={index}
                  slot={(index + 1) as 1 | 2 | 3}
                  generation={generation}
                  proposedTitle={proposedTitles[index]}
                  channelName={currentOrg?.name ?? orgSlug}
                  fallbackTitle={getPreviewFallbackTitle(video.internalTitle)}
                  isGeneratingTitle={isGeneratingTitle}
                  hasAllSlotsFilled={hasAllSlotsFilled}
                  onClearSlot={
                    generation ? () => void clearSlot(generation.id) : undefined
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </LayoutContent>
    </Layout>
  );
}

function getVideoPreviewImage(video: VideoDetail) {
  return (
    video.generations.find(
      (generation) => generation.selectedThumbnail?.imageUrl,
    )?.selectedThumbnail?.imageUrl ?? null
  );
}

function YoutubeGridPreviewCard({
  slot,
  generation,
  proposedTitle,
  channelName,
  fallbackTitle,
  isGeneratingTitle,
  hasAllSlotsFilled,
  onClearSlot,
}: {
  slot: 1 | 2 | 3;
  generation: VideoGenerationDetail | undefined;
  proposedTitle: string | undefined;
  channelName: string;
  fallbackTitle: string;
  isGeneratingTitle: boolean;
  hasAllSlotsFilled: boolean;
  onClearSlot?: () => void;
}) {
  const imageUrl = generation?.selectedThumbnail?.imageUrl;
  const isWaitingForTitle = hasAllSlotsFilled && isGeneratingTitle;
  const displayTitle =
    proposedTitle ??
    (isWaitingForTitle
      ? "Generating title..."
      : imageUrl
        ? fallbackTitle
        : `Slot ${slot}`);
  const channelInitial = getChannelInitial(channelName);
  const duration = getPreviewDuration(slot);

  return (
    <article className="group min-w-0">
      <div
        className={cn(
          "bg-muted relative aspect-video overflow-hidden rounded-xl",
          imageUrl ? "border-0" : "border border-dashed",
        )}
      >
        {imageUrl ? (
          <>
            <Image
              src={imageUrl}
              alt={`Slot ${slot}`}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-[1.015]"
            />
            <span className="absolute right-2 bottom-2 rounded bg-black/85 px-1.5 py-0.5 text-xs leading-none font-semibold text-white">
              {duration}
            </span>
          </>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2">
            <div className="bg-background flex size-11 items-center justify-center rounded-full border">
              <ImageIcon className="text-muted-foreground size-5" />
            </div>
            <span className="text-muted-foreground text-xs font-medium">
              Slot {slot}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex min-w-0 gap-3">
        <div className="bg-secondary text-secondary-foreground flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold">
          {channelInitial}
        </div>
        <div className="min-w-0 flex-1">
          {isWaitingForTitle && !proposedTitle ? (
            <div className="flex min-h-10 flex-col justify-center gap-1.5">
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-7/12" />
            </div>
          ) : (
            <h3
              title={displayTitle}
              className="line-clamp-2 min-h-10 text-[15px] leading-5 font-semibold text-pretty"
            >
              {displayTitle}
            </h3>
          )}
          <p className="text-muted-foreground mt-1 truncate text-sm">
            {channelName}
          </p>
          <p className="text-muted-foreground truncate text-sm">
            Draft preview | Thumbnail {slot}
          </p>
        </div>
        {onClearSlot ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground -mr-2 size-8 shrink-0 rounded-full"
                aria-label={`Open slot ${slot} actions`}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClearSlot}>
                <X className="mr-2 size-4" />
                Clear slot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <MoreVertical
            className="text-muted-foreground mt-1 size-5 shrink-0"
            aria-hidden="true"
          />
        )}
      </div>
    </article>
  );
}

function getChannelInitial(channelName: string) {
  const initial = channelName.trim().charAt(0).toUpperCase();
  return initial.length > 0 ? initial : "T";
}

function getPreviewFallbackTitle(internalTitle: string) {
  return internalTitle.trim().length > 0 ? internalTitle : "Untitled video";
}

function getPreviewDuration(slot: 1 | 2 | 3) {
  const durationBySlot = {
    1: "8:42",
    2: "12:18",
    3: "16:04",
  } satisfies Record<1 | 2 | 3, string>;

  return durationBySlot[slot];
}
