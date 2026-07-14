import { useQuery as useConvexQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { useConvexInfiniteQuery } from "@/hooks/use-convex-infinite-query";
import type { UserImageData } from "./editor.schema";

export type ThumbnailStatus =
  | "pending"
  | "processing"
  | "completed"
  | "succeeded"
  | "failed";

export type ThumbnailData = {
  id: string;
  generationId: string;
  imageUrl: string | null;
  error: string | null;
  model: string | null;
  generationTimeMs: number | null;
  routingFinalProvider: string | null;
  isStarred: boolean;
  status: ThumbnailStatus;
  claimedAt: Date | null;
  createdAt: Date;
};

export type GenerationWithThumbnails = {
  id: string;
  promptId: string;
  generationNumber: number;
  pendingCount: number;
  textPrompt: string;
  personIds: string[];
  inspirationIds: string[];
  userImageIds: string[];
  userImages: UserImageData[];
  personImageUrls: string[];
  inspirationUrls: string[];
  baseImageUrl: string | null;
  baseThumbnailId: string | null;
  editPrompt: string | null;
  aspectRatio: string;
  createdAt: Date;
  thumbnails: ThumbnailData[];
};

export type InspirationData = {
  id: string;
  name: string;
  thumbnailUrls: string[];
  aiDescription: string;
};

export type PromptWithRelations = {
  id: string;
  orgId: string;
  name: string | null;
  textPrompt: string;
  userImageIds: string[];
  userImages: UserImageData[];
  personIds: string[];
  inspirationIds: string[];
  createdAt: Date;
  generations: GenerationWithThumbnails[];
};

export const promptKeys = {
  all: ["prompts"] as const,
  list: (orgSlug: string) => [...promptKeys.all, "list", orgSlug] as const,
  infinite: (orgSlug: string, search?: string) =>
    [...promptKeys.all, "infinite", orgSlug, search] as const,
  detail: (orgSlug: string, promptId: string) =>
    [...promptKeys.all, "detail", orgSlug, promptId] as const,
};

export const thumbnailKeys = {
  all: ["thumbnails"] as const,
  infinite: (orgSlug: string, starred?: boolean) =>
    [...thumbnailKeys.all, "infinite", orgSlug, starred] as const,
};

export async function fetchPrompts(
  orgSlug: string,
): Promise<PromptWithRelations[]> {
  void orgSlug;
  throw new Error("fetchPrompts has moved to Convex usePrompts");
}

export async function fetchPrompt(
  orgSlug: string,
  promptId: string,
): Promise<PromptWithRelations> {
  void orgSlug;
  void promptId;
  throw new Error("fetchPrompt has moved to Convex usePrompt");
}

export function usePrompts(orgSlug: string) {
  const data = useConvexQuery(listPromptsRef, orgSlug ? { orgSlug } : "skip");

  return {
    data: data?.items as PromptWithRelations[] | undefined,
    isLoading: data === undefined,
  };
}

export function usePrompt(
  orgSlug: string,
  promptId: string,
  options?: {
    initialData?: PromptWithRelations;
    enabled?: boolean;
  },
) {
  const enabled = options?.enabled ?? (Boolean(orgSlug) && Boolean(promptId));
  const data = useConvexQuery(
    getPromptRef,
    enabled ? { orgSlug, promptId } : "skip",
  ) as PromptWithRelations | undefined;
  const prompt = data ?? options?.initialData;

  return {
    data: prompt,
    isLoading: enabled && data === undefined && !options?.initialData,
    isFetched: !enabled || data !== undefined || Boolean(options?.initialData),
  };
}

export type PromptListItem = Omit<PromptWithRelations, "generations"> & {
  generations: GenerationWithThumbnails[];
  _count: { generations: number };
};

type InfinitePromptsResponse = {
  items: PromptListItem[];
  nextCursor: string | undefined;
};

const listPromptsRef = makeFunctionReference<
  "query",
  {
    orgSlug: string;
    search?: string;
    cursor?: string;
    limit?: number;
    refreshNonce?: number;
  },
  InfinitePromptsResponse
>("editor:listPrompts");

const getPromptRef = makeFunctionReference<
  "query",
  { orgSlug: string; promptId: string },
  PromptWithRelations | null
>("editor:getPrompt");

export function useInfinitePrompts(orgSlug: string, search?: string) {
  return useConvexInfiniteQuery<PromptListItem>(
    listPromptsRef,
    orgSlug ? { orgSlug, search } : null,
    {
      keyParts: [orgSlug, search ?? ""],
      pageSize: 20,
    },
  );
}

export type ThumbnailListItem = {
  id: string;
  imageUrl: string;
  isStarred: boolean;
  createdAt: Date;
  generation: {
    id: string;
    promptId: string;
    generationNumber: number;
    textPrompt: string;
    aspectRatio: string;
  };
};

type InfiniteThumbnailsResponse = {
  items: ThumbnailListItem[];
  nextCursor: string | undefined;
};

const listGenerationsRef = makeFunctionReference<
  "query",
  {
    orgSlug: string;
    cursor?: string;
    limit?: number;
    starred?: boolean;
    refreshNonce?: number;
  },
  InfiniteThumbnailsResponse
>("app:listGenerations");

export function useInfiniteThumbnails(orgSlug: string, starred?: boolean) {
  return useConvexInfiniteQuery<ThumbnailListItem>(
    listGenerationsRef,
    orgSlug ? { orgSlug, starred } : null,
    {
      keyParts: [orgSlug, starred === true ? "starred" : "all"],
      pageSize: 20,
    },
  );
}
