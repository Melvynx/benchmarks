import { useQuery as useConvexQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useConvexInfiniteQuery } from "@/hooks/use-convex-infinite-query";

export type VideoSlotData = {
  id: string;
  slot: number | null;
  selectedThumbnail: {
    id: string;
    imageUrl: string | null;
  } | null;
};

export type VideoListItem = {
  id: string;
  internalTitle: string;
  youtubeUrl: string | null;
  description: string;
  closedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
  generations: VideoSlotData[];
  _count: {
    generations: number;
  };
};

export type VideoThumbnailData = {
  id: string;
  imageUrl: string | null;
  createdAt: Date;
};

export type VideoGenerationData = {
  id: string;
  slot: number | null;
  addedAt: Date;
  selectedThumbnailId: string | null;
  selectedThumbnail: {
    id: string;
    imageUrl: string | null;
  } | null;
  generation: {
    id: string;
    promptId: string | null;
    textPrompt: string;
    generationNumber: number;
    thumbnails: VideoThumbnailData[];
  };
  titles: {
    id: string;
    text: string;
    thumbnailId: string;
    createdAt: Date;
  }[];
};

export type VideoDetail = {
  id: string;
  organizationId: string;
  internalTitle: string;
  youtubeUrl: string | null;
  description: string;
  closedAt: string | null;
  createdAt: Date;
  updatedAt: Date;
  generations: VideoGenerationData[];
};

// Alias for backward compat / clarity in components
export type VideoGenerationDetail = VideoGenerationData;

export const videoKeys = {
  all: ["videos"] as const,
  list: (orgSlug: string) => [...videoKeys.all, "list", orgSlug] as const,
  infinite: (orgSlug: string) =>
    [...videoKeys.all, "infinite", orgSlug] as const,
  detail: (orgSlug: string, videoId: string) =>
    [...videoKeys.all, "detail", orgSlug, videoId] as const,
};

type InfiniteVideosResponse = {
  items: VideoListItem[];
  nextCursor: string | undefined;
};

const listVideosRef = makeFunctionReference<
  "query",
  {
    orgSlug: string;
    cursor?: string;
    limit?: number;
    refreshNonce?: number;
    finished?: boolean;
  },
  InfiniteVideosResponse
>("video:list");

const videoDetailRef = makeFunctionReference<
  "query",
  { orgSlug: string; videoId: string },
  VideoDetail | null
>("video:detail");

export function useInfiniteVideos(
  orgSlug: string,
  finished?: boolean,
  refreshNonce?: number,
) {
  const args = orgSlug
    ? {
        orgSlug,
        ...(finished === undefined ? {} : { finished }),
        refreshNonce,
      }
    : null;

  return useConvexInfiniteQuery<VideoListItem>(listVideosRef, args, {
    keyParts: [orgSlug, finished ?? "all", refreshNonce ?? 0],
    pageSize: 12,
  });
}

export function useVideo(orgSlug: string, videoId: string) {
  const data = useConvexQuery(
    videoDetailRef,
    orgSlug && videoId ? { orgSlug, videoId } : "skip",
  ) as VideoDetail | undefined;

  return {
    data,
    isLoading: orgSlug && videoId ? data === undefined : false,
  };
}
