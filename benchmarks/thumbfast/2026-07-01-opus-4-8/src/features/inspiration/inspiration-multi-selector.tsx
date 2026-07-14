import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEditorStore } from "@/features/editor/editor.store";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import { showImageLimitDialog } from "@/features/editor/show-image-limit-dialog";
import { Loader2, Pencil, Plus, Sparkles, Star, X } from "lucide-react";
import {
  BorderedDialogContent,
  BorderedDialogFooter,
  DialogEscClose,
} from "@/components/bordered-dialog";
import Image from "@/compat/image";
import { useParams } from "@/compat/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { updateInspirationNameRef } from "./inspiration.convex";
import {
  useMutation as useConvexMutation,
  useQueries as useConvexQueries,
} from "convex/react";
import { InspirationDetailDialog } from "./inspiration-detail-dialog";
import { InspirationDialog } from "./inspiration-dialog";
import {
  inspirationDetailRef,
  type InspirationFilter,
  type InspirationListItem,
  useInfiniteInspirations,
  useInspirations,
} from "./inspiration.query";
import { THUMBNAIL_CATEGORIES, type ThumbnailCategory } from "@/lib/ai/gemini";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type InspirationMultiSelectorProps = {
  value: string[];
  onChange: (inspirationIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

const EMPTY_INSPIRATION_QUERIES = {};

export function InspirationMultiSelector({
  value,
  onChange,
  disabled = false,
}: InspirationMultiSelectorProps) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { data, isLoading } = useInspirations(orgSlug);
  const inspirations = data?.items;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InspirationFilter>("mine");
  const [category, setCategory] = useState<ThumbnailCategory | undefined>(
    undefined,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailInspiration, setDetailInspiration] =
    useState<InspirationListItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const currentOrg = useCurrentOrg();
  const updateInspirationName = useConvexMutation(updateInspirationNameRef);
  const {
    addInspirationId,
    removeInspirationId,
    canAddImages,
    inspirations: storeInspirations,
    setInspirations,
  } = useEditorStore();

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteInspirations(orgSlug, filter, search || undefined, category);

  const displayResults: InspirationListItem[] = infiniteData.pages.flatMap(
    (page) => page.items,
  );

  const knownInspirations = [
    ...(inspirations ?? []),
    ...storeInspirations,
    ...displayResults,
  ];

  const knownIds = new Set(knownInspirations.map((i) => i.id));

  const missingIds = value.filter((id) => !knownIds.has(id));
  const missingIdsKey = missingIds.join("|");
  const missingQuerySpecs = useMemo(() => {
    if (!missingIdsKey) {
      return EMPTY_INSPIRATION_QUERIES;
    }

    return Object.fromEntries(
      missingIds.map((id) => [
        id,
        { query: inspirationDetailRef, args: { orgSlug, inspirationId: id } },
      ]),
    );
    // missingIdsKey keeps the query object stable for equivalent selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingIdsKey, orgSlug]);

  const missingQueries = useConvexQueries(missingQuerySpecs);

  const fetchedInspirations: InspirationListItem[] = Object.values(
    missingQueries,
  ).filter(
    (result): result is InspirationListItem =>
      result !== undefined && !(result instanceof Error),
  );

  const allAvailableInspirations = [
    ...knownInspirations,
    ...fetchedInspirations,
  ];

  const inspirationMap = new Map(
    allAvailableInspirations.map((i) => [i.id, i]),
  );

  const selectedInspirations = value
    .map((id) => inspirationMap.get(id))
    .filter((i): i is InspirationListItem => i !== undefined);

  useEffect(() => {
    if (!open) return;

    const scrollContainerRef = { current: null as HTMLElement | null };

    const checkAndLoadMore = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (isNearBottom && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    };

    const timeoutId = setTimeout(() => {
      const el = document.querySelector(
        '[data-slot="command-list"]',
      ) as HTMLElement | null;

      scrollContainerRef.current = el;

      if (el) {
        el.addEventListener("scroll", checkAndLoadMore, { passive: true });
        checkAndLoadMore();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const el = scrollContainerRef.current;
      if (el) {
        el.removeEventListener("scroll", checkAndLoadMore);
      }
    };
  }, [open, hasNextPage, isFetchingNextPage, fetchNextPage, filter, category]);

  useEffect(() => {
    if (!open || isFetchingNextPage || !hasNextPage) return;

    const timeoutId = setTimeout(() => {
      const el = document.querySelector(
        '[data-slot="command-list"]',
      ) as HTMLElement | null;
      if (!el) return;

      const { scrollTop, scrollHeight, clientHeight } = el;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;

      if (isNearBottom) {
        void fetchNextPage();
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [
    open,
    displayResults.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  useHotkeys("n", () => setCreateDialogOpen(true), {
    enabled: open && !createDialogOpen,
    enableOnFormTags: false,
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const getInspirationImageCount = (inspirationId: string): number => {
    const fromStore = storeInspirations.find((i) => i.id === inspirationId);
    if (fromStore) return fromStore.thumbnailUrls.length;

    const fromSearch = displayResults.find((i) => i.id === inspirationId);
    if (fromSearch) return fromSearch.thumbnailUrls.length;

    return 1;
  };

  const handleSelect = (inspirationId: string) => {
    if (value.includes(inspirationId)) {
      removeInspirationId(inspirationId);
      onChange(value.filter((id) => id !== inspirationId));
    } else {
      const selectedInspiration = displayResults.find(
        (i) => i.id === inspirationId,
      );

      if (
        selectedInspiration &&
        !storeInspirations.some((i) => i.id === inspirationId)
      ) {
        setInspirations([...storeInspirations, selectedInspiration]);
      }

      const imageCount = getInspirationImageCount(inspirationId);
      if (canAddImages(imageCount)) {
        const added = addInspirationId(inspirationId);
        if (added) {
          onChange([...value, inspirationId]);
          setOpen(false);
        } else {
          showImageLimitDialog();
        }
      } else {
        showImageLimitDialog();
      }
    }
    setSearch("");
  };

  const handleRemove = (inspirationId: string) => {
    removeInspirationId(inspirationId);
    onChange(value.filter((id) => id !== inspirationId));
  };

  const handleCreateSuccess = (inspirationId: string) => {
    const added = addInspirationId(inspirationId);
    if (added) {
      onChange([...value, inspirationId]);
    } else {
      showImageLimitDialog();
    }
    setCreateDialogOpen(false);
    setOpen(false);
  };

  const handleStartEditing = (inspiration: InspirationListItem) => {
    setEditingId(inspiration.id);
    setEditingName(inspiration.name);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      setEditingId(null);
      return;
    }

    const trimmedName = editingName.trim();
    const inspiration = inspirationMap.get(editingId);
    if (!inspiration || inspiration.name === trimmedName) {
      setEditingId(null);
      return;
    }

    // Optimistically update the store
    setInspirations(
      storeInspirations.map((i) =>
        i.id === editingId ? { ...i, name: trimmedName } : i,
      ),
    );
    setEditingId(null);

    // Save to server
    await updateInspirationName({
      orgSlug,
      inspirationId: editingId,
      name: trimmedName,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <>
      <div className="border-input flex flex-col gap-2 rounded-xl border border-dashed p-2">
        {selectedInspirations.length > 0 && (
          <div className="flex flex-col gap-1">
            {selectedInspirations.map((inspiration) => (
              <div
                key={inspiration.id}
                className="flex items-center gap-3 rounded-lg p-2"
              >
                <button
                  type="button"
                  onClick={() => setDetailInspiration(inspiration)}
                  className="shrink-0 cursor-pointer"
                >
                  <Image
                    src={inspiration.thumbnailUrls[0]}
                    alt={inspiration.name}
                    width={96}
                    height={54}
                    className="aspect-video h-14 w-24 rounded-md object-cover transition-opacity hover:opacity-80"
                  />
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {editingId === inspiration.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleSaveEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleSaveEdit();
                        } else if (e.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      className="bg-input h-6 truncate rounded px-1 text-sm font-medium text-emerald-400 outline-none"
                      autoFocus
                    />
                  ) : (
                    <span
                      className="cursor-text truncate text-sm font-medium text-emerald-400"
                      onDoubleClick={() => handleStartEditing(inspiration)}
                      title="Double-click to rename"
                    >
                      {inspiration.name}
                    </span>
                  )}
                  <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                    {inspiration.aiDescription}
                  </span>
                </div>
                {!disabled && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDetailInspiration(inspiration)}
                      className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      title="Edit / Pixelate"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(inspiration.id)}
                      className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!disabled && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors"
          >
            <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded border">
              <Plus className="size-3.5 opacity-60" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Add Style Reference</span>
              <span className="text-muted-foreground text-xs">
                {value.length} selected
              </span>
            </div>
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <BorderedDialogContent
          maxWidth="sm:max-w-4xl"
          className="bg-clip-padding p-2 pb-11"
        >
          <div className="sr-only">
            <DialogTitle>Search Inspirations</DialogTitle>
            <DialogDescription>
              Search through all inspirations by name or description
            </DialogDescription>
          </div>
          <Command
            shouldFilter={false}
            className="**:data-[slot=command-input-wrapper]:bg-input/50 **:data-[slot=command-input-wrapper]:border-input rounded-none bg-transparent **:data-[slot=command-input]:!h-9 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:!h-9 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border"
          >
            <div className="flex items-center gap-2 pb-2">
              <div className="flex-1">
                <CommandInput
                  placeholder="Search inspirations..."
                  value={search}
                  onValueChange={setSearch}
                />
              </div>
              <Select
                value={category ?? "all"}
                onValueChange={(v) =>
                  setCategory(
                    v === "all" ? undefined : (v as ThumbnailCategory),
                  )
                }
              >
                <SelectTrigger className="h-9 w-[130px] text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {THUMBNAIL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as InspirationFilter)}
                className="shrink-0"
              >
                <TabsList className="h-9">
                  <TabsTrigger value="mine" className="px-3 text-xs">
                    My Library
                  </TabsTrigger>
                  <TabsTrigger value="all" className="px-3 text-xs">
                    Community
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <CommandList className="no-scrollbar max-h-[60vh] min-h-80 scroll-pt-2 scroll-pb-1.5">
              <CommandEmpty className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
                <Sparkles className="text-muted-foreground/50 size-10" />
                <span>No inspirations found</span>
              </CommandEmpty>
              {displayResults.length === 0 && filter === "mine" && !search ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Sparkles className="text-muted-foreground size-8" />
                  <p className="text-muted-foreground text-sm">
                    No inspirations in your library yet
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Create your first inspiration or browse the community
                  </p>
                </div>
              ) : (
                <CommandGroup className="!p-0 [&_[cmdk-group-heading]]:!p-3 [&_[cmdk-group-heading]]:!pb-1">
                  <div className="grid grid-cols-2 gap-2 p-1 sm:grid-cols-3 lg:grid-cols-4">
                    {displayResults.map((inspiration) => {
                      const isSelected = value.includes(inspiration.id);
                      return (
                        <CommandItem
                          key={inspiration.id}
                          value={`${inspiration.id} ${inspiration.name} ${inspiration.aiDescription}`}
                          onSelect={() => handleSelect(inspiration.id)}
                          className="data-[selected=true]:border-input data-[selected=true]:bg-input/50 relative cursor-pointer rounded-lg border border-transparent p-0 transition-all"
                        >
                          <Image
                            src={inspiration.thumbnailUrls[0]}
                            alt="Inspiration"
                            width={200}
                            height={112}
                            className="aspect-video w-full rounded-lg object-cover"
                          />
                          {inspiration.adminReview === "GOOD" && (
                            <div className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-amber-500 shadow-sm">
                              <Star className="size-3 fill-white text-white" />
                            </div>
                          )}
                          {inspiration.category && (
                            <Badge
                              variant="secondary"
                              className="bg-background/80 absolute bottom-1 left-1 text-[10px] backdrop-blur-sm"
                            >
                              {inspiration.category}
                            </Badge>
                          )}
                          {isSelected && (
                            <div className="bg-primary/60 absolute inset-0 flex items-center justify-center rounded-lg">
                              <span className="text-primary-foreground text-xs font-medium">
                                Selected
                              </span>
                            </div>
                          )}
                        </CommandItem>
                      );
                    })}
                  </div>
                  <div className="flex justify-center p-2">
                    {isFetchingNextPage && (
                      <Loader2 className="text-muted-foreground size-5 animate-spin" />
                    )}
                    {hasNextPage && !isFetchingNextPage && (
                      <span className="text-muted-foreground text-xs">
                        Scroll for more...
                      </span>
                    )}
                  </div>
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
              <DialogEscClose />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline-filled"
                onClick={() => setCreateDialogOpen(true)}
                disabled={createDialogOpen}
              >
                <Plus className="size-3.5" />
                New inspiration
                <Kbd className="ml-1">N</Kbd>
              </Button>
            </div>
          </BorderedDialogFooter>
        </BorderedDialogContent>
      </Dialog>

      <InspirationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <InspirationDetailDialog
        inspiration={detailInspiration}
        open={detailInspiration !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setDetailInspiration(null);
        }}
        currentOrgId={currentOrg?.id ?? ""}
        orgSlug={orgSlug}
        onImagesUpdated={(newUrls) => {
          if (detailInspiration) {
            const updatedInspiration = {
              ...detailInspiration,
              thumbnailUrls: newUrls,
            };
            setInspirations(
              storeInspirations.map((i) =>
                i.id === detailInspiration.id ? updatedInspiration : i,
              ),
            );
          }
        }}
        onInspirationCopied={(newInspiration) => {
          setInspirations([...storeInspirations, newInspiration]);
          setDetailInspiration(newInspiration);
          onChange([
            ...value.filter((id) => id !== detailInspiration?.id),
            newInspiration.id,
          ]);
        }}
        onInspirationAnonymized={(updatedInspiration) => {
          setInspirations(
            storeInspirations.map((i) =>
              i.id === updatedInspiration.id ? updatedInspiration : i,
            ),
          );
          setDetailInspiration(updatedInspiration);
        }}
      />
    </>
  );
}
