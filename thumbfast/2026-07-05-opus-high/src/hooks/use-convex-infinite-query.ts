import { useConvex, useQuery as useConvexQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type InfiniteQueryPage<TItem extends { id: string }> = {
  items: TItem[];
  nextCursor: string | undefined;
};

type UseConvexInfiniteQueryOptions = {
  keyParts: readonly unknown[];
  pageSize?: number;
};

const pageCache = new Map<string, InfiniteQueryPage<{ id: string }>[]>();

function getCachedPages<TItem extends { id: string }>(cacheKey: string) {
  return (
    (pageCache.get(cacheKey) as InfiniteQueryPage<TItem>[] | undefined) ?? []
  );
}

function setCachedPages<TItem extends { id: string }>(
  cacheKey: string,
  pages: InfiniteQueryPage<TItem>[],
) {
  pageCache.set(cacheKey, pages);
}

function getQueryRefName(queryRef: FunctionReference<"query">) {
  const ref = queryRef as FunctionReference<"query"> & {
    _name?: string;
    name?: string;
  };

  return ref._name ?? ref.name ?? JSON.stringify(queryRef);
}

export function useConvexInfiniteQuery<TItem extends { id: string }>(
  queryRef: FunctionReference<"query">,
  args: Record<string, unknown> | null,
  options: UseConvexInfiniteQueryOptions,
) {
  const convex = useConvex();
  const pageSize = options.pageSize ?? 20;
  const queryKey = options.keyParts.map(String).join(":");
  const cacheKey = `${getQueryRefName(queryRef)}:${pageSize}:${queryKey}`;
  const [pages, setPages] = useState<InfiniteQueryPage<TItem>[]>(() =>
    getCachedPages<TItem>(cacheKey),
  );
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const pagesRef = useRef<InfiniteQueryPage<TItem>[]>(pages);
  const argsRef = useRef(args);
  const stableArgsRef = useRef(args);
  const firstPageKeyRef = useRef<string | null>(null);
  const isFetchingNextPageRef = useRef(false);
  const queryKeyRef = useRef(queryKey);
  const clearedQueryKeyRef = useRef(queryKey);

  if (queryKeyRef.current !== queryKey) {
    queryKeyRef.current = queryKey;
    stableArgsRef.current = args;
  } else if (!stableArgsRef.current && args) {
    stableArgsRef.current = args;
  }
  const stableArgs = stableArgsRef.current;

  useEffect(() => {
    argsRef.current = stableArgsRef.current;
  }, [queryKey]);

  useEffect(() => {
    if (clearedQueryKeyRef.current === queryKey) return;

    clearedQueryKeyRef.current = queryKey;
    const cachedPages = getCachedPages<TItem>(cacheKey);
    pagesRef.current = cachedPages;
    firstPageKeyRef.current = null;
    setPages(cachedPages);
  }, [cacheKey, queryKey]);

  const firstPageArgs = useMemo(
    () =>
      stableArgs
        ? ({
            ...stableArgs,
            limit: pageSize,
          } as Record<string, unknown>)
        : "skip",
    [pageSize, stableArgs],
  );

  const firstPage = useConvexQuery(queryRef, firstPageArgs) as
    | InfiniteQueryPage<TItem>
    | undefined;

  const firstPageKey = useMemo(() => {
    if (!firstPage) return null;
    return [
      queryKey,
      firstPage.nextCursor ?? "",
      firstPage.items.map((item) => item.id).join(","),
    ].join(":");
  }, [firstPage, queryKey]);

  useEffect(() => {
    if (!firstPage) {
      return;
    }

    setPages((currentPages) => {
      const shouldPreserveLoadedPages =
        firstPageKeyRef.current === firstPageKey && currentPages.length > 0;
      firstPageKeyRef.current = firstPageKey;
      const nextPages = shouldPreserveLoadedPages
        ? [firstPage, ...currentPages.slice(1)]
        : [firstPage];
      pagesRef.current = nextPages;
      setCachedPages(cacheKey, nextPages);
      return nextPages;
    });
  }, [cacheKey, firstPage, firstPageKey]);

  const fetchNextPage = useCallback(async () => {
    const cursor = pagesRef.current.at(-1)?.nextCursor;
    const currentArgs = argsRef.current;
    if (!currentArgs || !cursor || isFetchingNextPageRef.current) return;

    isFetchingNextPageRef.current = true;
    setIsFetchingNextPage(true);
    try {
      const nextPage = await convex.query(queryRef, {
        ...currentArgs,
        cursor,
        limit: pageSize,
      });
      setPages((currentPages) => {
        const nextPages = [...currentPages, nextPage];
        pagesRef.current = nextPages;
        setCachedPages(cacheKey, nextPages);
        return nextPages;
      });
    } finally {
      isFetchingNextPageRef.current = false;
      setIsFetchingNextPage(false);
    }
  }, [cacheKey, convex, pageSize, queryRef]);

  const refresh = useCallback(async () => {
    const currentArgs = argsRef.current;
    pagesRef.current = [];
    firstPageKeyRef.current = null;
    setPages([]);
    pageCache.delete(cacheKey);

    if (!currentArgs) return;

    const firstPageResult = await convex.query(queryRef, {
      ...currentArgs,
      limit: pageSize,
    });
    pagesRef.current = [firstPageResult];
    setCachedPages(cacheKey, [firstPageResult]);
    setPages([firstPageResult]);
  }, [cacheKey, convex, pageSize, queryRef]);

  const data = useMemo(() => ({ pages, pageParams: [] }), [pages]);

  return {
    data,
    fetchNextPage,
    hasNextPage: Boolean(pages.at(-1)?.nextCursor),
    isFetchingNextPage,
    isLoading: Boolean(args) && firstPage === undefined && pages.length === 0,
    refresh,
  };
}
