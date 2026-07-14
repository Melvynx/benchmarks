import type { ThumbnailCategory } from "@/lib/ai/gemini";
import { useConvexInfiniteQuery } from "@/hooks/use-convex-infinite-query";
import { useQuery as useConvexQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";

export type InspirationFilter = "mine" | "all";
export type AdminReviewStatus = "GOOD" | "APPROVED" | "PENDING" | "DENY";

export type InspirationListItem = {
  id: string;
  name: string;
  aiDescription: string;
  category: ThumbnailCategory | null;
  thumbnailUrls: string[];
  createdAt: string;
  adminReview: AdminReviewStatus;
  isPublic: boolean;
  orgId: string;
  hasPlaceholder: boolean;
  anonymizedSubject: boolean;
  anonymizedText: boolean;
  anonymizedLogos: boolean;
  anonymizedTextDescription: string | null;
  youtubeUrl: string | null;
  sourceVideoTitle: string | null;
  sourceVideoAuthor: string | null;
  sourceVideoThumbnailUrl: string | null;
  sourceType: "youtube" | "upload" | "drawing" | null;
  hasDrawing: boolean;
  drawingData: string | null;
};

export type Inspiration = InspirationListItem;

export function isAnonymizedInspiration(
  inspiration: Pick<
    InspirationListItem,
    "hasPlaceholder" | "thumbnailUrls" | "anonymizedSubject"
  >,
) {
  return inspiration.anonymizedSubject || inspiration.hasPlaceholder;
}

type InfiniteInspirationsResponse = {
  items: InspirationListItem[];
  nextCursor: string | undefined;
};

const INSPIRATIONS_PAGE_SIZE = 60;

export const listInspirationsRef = makeFunctionReference<
  "query",
  {
    orgSlug: string;
    filter?: InspirationFilter;
    search?: string;
    category?: ThumbnailCategory;
    cursor?: string;
    limit?: number;
  },
  InfiniteInspirationsResponse
>("inspiration:list");

export const inspirationDetailRef = makeFunctionReference<
  "query",
  { orgSlug: string; inspirationId: string },
  Inspiration
>("inspiration:detail");

export const searchInspirationsRef = makeFunctionReference<
  "query",
  { orgSlug: string; q?: string; limit?: number },
  InspirationListItem[]
>("inspiration:search");

export const inspirationKeys = {
  all: ["inspirations"] as const,
  list: (orgSlug: string, filter: InspirationFilter) =>
    [...inspirationKeys.all, "list", orgSlug, filter] as const,
  infinite: (
    orgSlug: string,
    filter: InspirationFilter,
    search?: string,
    category?: ThumbnailCategory,
  ) =>
    [
      ...inspirationKeys.all,
      "infinite",
      orgSlug,
      filter,
      search,
      category,
    ] as const,
  detail: (orgSlug: string, inspirationId: string) =>
    [...inspirationKeys.all, "detail", orgSlug, inspirationId] as const,
};

export function useInspirations(
  orgSlug: string,
  filter: InspirationFilter = "mine",
) {
  const data = useConvexQuery(
    listInspirationsRef,
    orgSlug ? { orgSlug, filter } : "skip",
  );
  return { data, isLoading: data === undefined };
}

export function useInspiration(orgSlug: string, inspirationId: string) {
  const data = useConvexQuery(
    inspirationDetailRef,
    orgSlug && inspirationId ? { orgSlug, inspirationId } : "skip",
  );
  return { data, isLoading: data === undefined };
}

export function useInfiniteInspirations(
  orgSlug: string,
  filter: InspirationFilter = "mine",
  search?: string,
  category?: ThumbnailCategory,
) {
  return useConvexInfiniteQuery<InspirationListItem>(
    listInspirationsRef,
    orgSlug
      ? {
          orgSlug,
          filter,
          search,
          category,
        }
      : null,
    {
      keyParts: [orgSlug, filter, search ?? "", category ?? ""],
      pageSize: INSPIRATIONS_PAGE_SIZE,
    },
  );
}
