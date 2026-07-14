import { Button, buttonVariants } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dialogManager } from "@/features/dialog-manager/dialog-manager";
import { deleteInspirationRef } from "@/features/inspiration/inspiration.convex";
import { InspirationDialog } from "@/features/inspiration/inspiration-dialog";
import {
  type InspirationFilter,
  type InspirationListItem,
  useInfiniteInspirations,
} from "@/features/inspiration/inspiration.query";
import {
  Layout,
  LayoutActions,
  LayoutContent,
  LayoutHeader,
  LayoutTitle,
} from "@/features/page/layout";
import { Typography } from "@/components/nowts/typography";
import { EmptyState } from "@/features/organization/loading-state";
import { THUMBNAIL_CATEGORIES, type ThumbnailCategory } from "@/lib/ai/gemini";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@/hooks/use-async-mutation";
import { useMutation as useConvexMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  EllipsisVertical,
  ExternalLink,
  ImageIcon,
  Loader2,
  MoreVertical,
  PenLine,
  PlayCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const filterOptions = ["mine", "all"] as const;

type InspirationsSearch = {
  filter?: InspirationFilter;
};

export const Route = createFileRoute("/orgs/$orgSlug/inspirations/")({
  validateSearch: (search: Record<string, unknown>): InspirationsSearch => ({
    filter: filterOptions.includes(search.filter as InspirationFilter)
      ? (search.filter as InspirationFilter)
      : "mine",
  }),
  component: InspirationsRoute,
});

function InspirationsRoute() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/inspirations/" });
  const routeSearch = Route.useSearch();
  const filter = routeSearch.filter ?? "mine";
  const [category, setCategory] = useState<ThumbnailCategory | undefined>();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [dialogOpen, setDialogOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteInspirations(
      orgSlug,
      filter,
      deferredSearch || undefined,
      category,
    );
  const inspirations = data.pages.flatMap((page) => page.items);

  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(currentRef);
    return () => observer.unobserve(currentRef);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openTutorialDialog = () => {
    dialogManager.custom({
      title: "How to Use Inspirations",
      description:
        "Learn how to use inspirations to guide your AI thumbnail generation.",
      size: "xl",
      children: (
        <div className="flex flex-col gap-4">
          <div className="aspect-video w-full overflow-hidden rounded-lg">
            <iframe
              src="https://www.tella.tv/video/generez-des-images-ia-avec-inspiration-6i59/embed?b=0&title=0&a=1&loop=0&t=0&muted=0&wt=0"
              title="Inspirations tutorial"
              className="size-full"
              allowFullScreen
              allow="autoplay; fullscreen"
            />
          </div>
          <Link
            href="/docs/guides/inspiration-guide"
            className={buttonVariants({ variant: "outline" })}
          >
            <BookOpen className="mr-2 size-4" />
            Read Full Documentation
          </Link>
        </div>
      ),
    });
  };

  const updateFilter = (nextFilter: InspirationFilter) => {
    void navigate({
      search: (previous) => ({ ...previous, filter: nextFilter }),
    });
  };

  return (
    <Layout size="lg">
      <LayoutHeader>
        <LayoutTitle>Inspirations</LayoutTitle>
      </LayoutHeader>
      <LayoutActions>
        <Button
          variant="outline"
          className="hidden md:inline-flex"
          onClick={openTutorialDialog}
        >
          <PlayCircle className="mr-2 size-4" />
          Watch Tutorial
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <EllipsisVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={openTutorialDialog}>
              <PlayCircle className="mr-2 size-4" />
              Watch Tutorial
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Link
          href={`/orgs/${orgSlug}/inspirations/draw`}
          className={buttonVariants({ variant: "outline" })}
        >
          <PenLine className="mr-2 size-4" />
          Draw
        </Link>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Inspiration
        </Button>
      </LayoutActions>

      <InspirationDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <LayoutContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search inspirations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs
            value={filter}
            onValueChange={(value) => updateFilter(value as InspirationFilter)}
          >
            <TabsList>
              <TabsTrigger value="mine">My Library</TabsTrigger>
              <TabsTrigger value="all">Community</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={category ?? "all"}
            onValueChange={(value) =>
              setCategory(
                value === "all" ? undefined : (value as ThumbnailCategory),
              )
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {THUMBNAIL_CATEGORIES.map((thumbnailCategory) => (
                <SelectItem key={thumbnailCategory} value={thumbnailCategory}>
                  {thumbnailCategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <Skeleton
                key={item}
                className="aspect-video w-full rounded-2xl"
              />
            ))}
          </div>
        ) : inspirations.length === 0 ? (
          <EmptyState
            title="No inspirations yet"
            description="Add YouTube thumbnails as style references for your generations."
            action={
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add Inspiration
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {inspirations.map((inspiration) => (
                <InspirationCard
                  key={inspiration.id}
                  inspiration={inspiration}
                  orgSlug={orgSlug}
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

function InspirationCard({
  inspiration,
  orgSlug,
}: {
  inspiration: InspirationListItem;
  orgSlug: string;
}) {
  const deleteInspiration = useConvexMutation(deleteInspirationRef);
  const detailsHref = `/orgs/${orgSlug}/inspirations/${inspiration.id}`;
  const editDrawingHref = `/orgs/${orgSlug}/inspirations/draw?inspirationId=${inspiration.id}`;
  const hasImage = Boolean(inspiration.thumbnailUrls[0]);
  const relativeDate = formatDistanceToNow(new Date(inspiration.createdAt));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return deleteInspiration({ orgSlug, inspirationId: inspiration.id });
    },
    onSuccess: async () => {
      toast.success("Inspiration deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    dialogManager.confirm({
      title: "Delete inspiration",
      description:
        "Are you sure you want to delete this inspiration? This action cannot be undone.",
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

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group border-border hover:border-primary/50 relative aspect-video cursor-pointer overflow-hidden rounded-2xl border transition-colors duration-150">
          {/* Full-bleed image */}
          <Link href={detailsHref} className="absolute inset-0 block">
            {hasImage ? (
              <Image
                src={inspiration.thumbnailUrls[0]}
                alt={inspiration.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="bg-muted flex size-full items-center justify-center">
                <ImageIcon className="text-muted-foreground size-10" />
              </div>
            )}
          </Link>

          {/* Gradient scrim — only over bottom half for text legibility */}
          {hasImage ? (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, oklch(0.10 0 0 / 0.82) 0%, transparent 50%)",
              }}
            />
          ) : null}

          {/* Three-dot menu — near-invisible at rest, revealed on hover */}
          <div className="absolute top-2 right-2 z-20 opacity-35 transition-opacity duration-150 group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md hover:bg-black/50"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <MoreVertical className="size-3.5 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={detailsHref}>
                    <ExternalLink className="mr-2 size-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                {inspiration.hasDrawing ? (
                  <DropdownMenuItem asChild>
                    <Link href={editDrawingHref}>
                      <PenLine className="mr-2 size-4" />
                      Edit Drawing
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {inspiration.youtubeUrl ? (
                  <DropdownMenuItem asChild>
                    <a
                      href={inspiration.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 size-4" />
                      Open YouTube
                    </a>
                  </DropdownMenuItem>
                ) : null}
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

          {/* Bottom info — title and relative date, subtle overlay */}
          {hasImage ? (
            <Link
              href={detailsHref}
              className="absolute inset-x-0 bottom-0 z-10 block p-3"
            >
              <Typography
                variant="small"
                as="h3"
                className="line-clamp-1 text-white/75"
              >
                {inspiration.name}
              </Typography>
              <Typography
                variant="muted"
                as="p"
                className="mt-0.5 text-[10.5px] text-white/30"
              >
                {relativeDate} ago
              </Typography>
            </Link>
          ) : null}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem asChild>
          <Link href={detailsHref}>
            <ExternalLink className="mr-2 size-4" />
            View Details
          </Link>
        </ContextMenuItem>
        {inspiration.hasDrawing ? (
          <ContextMenuItem asChild>
            <Link href={editDrawingHref}>
              <PenLine className="mr-2 size-4" />
              Edit Drawing
            </Link>
          </ContextMenuItem>
        ) : null}
        {inspiration.youtubeUrl ? (
          <ContextMenuItem asChild>
            <a
              href={inspiration.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 size-4" />
              Open YouTube
            </a>
          </ContextMenuItem>
        ) : null}
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
