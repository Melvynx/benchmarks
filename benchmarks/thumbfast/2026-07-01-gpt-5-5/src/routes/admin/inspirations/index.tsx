import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Layout, LayoutContent } from "@/features/page/layout";
import { dayjs } from "@/lib/dayjs";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  Check,
  EyeOff,
  ImageOff,
  Loader2,
  RotateCcw,
  SearchIcon,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AdminPageHeader } from "../_components/admin-shared";
import {
  AdminInspirationGridSkeleton,
  AdminInspirationsPageSkeleton,
} from "../_components/admin-skeletons";

const REVIEW_STATUSES = ["GOOD", "APPROVED", "PENDING", "DENY"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

const REVIEW_OPTIONS = [
  { value: "all", label: "All reviews" },
  { value: "GOOD", label: "Starred" },
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "DENY", label: "Hidden" },
] as const;

const REVIEW_ACTIONS = [
  { status: "APPROVED", label: "Approve", icon: Check },
  { status: "GOOD", label: "Star", icon: Star },
  { status: "DENY", label: "Hide from public", icon: EyeOff },
  { status: "PENDING", label: "Move to pending", icon: RotateCcw },
] as const;

const REVIEW_STATUS_SET = new Set<string>(REVIEW_STATUSES);
const REVIEW_RANK: Record<ReviewStatus, number> = {
  PENDING: 0,
  GOOD: 1,
  APPROVED: 2,
  DENY: 3,
};

export const Route = createFileRoute("/admin/inspirations/")({
  validateSearch: z.object({
    search: z.string().optional().default(""),
    review: z.enum(REVIEW_STATUSES).optional(),
  }),
  component: AdminInspirationsRoute,
  pendingComponent: AdminInspirationsPageSkeleton,
});

type InspirationItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.queries.listInspirations>>
>[number];

function useInspirationReviewMutation() {
  return useMutation(
    api.admin.mutations.setInspirationReviewStatus,
  ).withOptimisticUpdate((localStore, args) => {
    const queries = localStore.getAllQueries(
      api.admin.queries.listInspirations,
    );
    const updatedInspiration = queries
      .flatMap((query) => query.value ?? [])
      .find((inspiration) => inspiration.id === args.inspirationId);

    if (!updatedInspiration) return;

    const nextInspiration = applyReviewStatus(updatedInspiration, args.status);

    for (const query of queries) {
      if (!query.value) continue;

      const withoutReviewed = query.value.filter(
        (inspiration) => inspiration.id !== args.inspirationId,
      );
      const nextValue = matchesInspirationQuery(nextInspiration, query.args)
        ? sortInspirationsForReview([...withoutReviewed, nextInspiration])
        : withoutReviewed;

      localStore.setQuery(
        api.admin.queries.listInspirations,
        query.args,
        nextValue,
      );
    }
  });
}

function applyReviewStatus(
  inspiration: InspirationItem,
  status: ReviewStatus,
): InspirationItem {
  const approved = status === "GOOD" || status === "APPROVED";

  return {
    ...inspiration,
    adminReview: status,
    isPublic: approved,
    reviewedAt: approved ? Date.now() : null,
  };
}

function matchesInspirationQuery(
  inspiration: InspirationItem,
  args: { search?: string; review?: string },
) {
  const review = normalizeReviewStatus(args.review);

  if (review && inspiration.adminReview !== review) return false;

  const search = args.search?.trim().toLowerCase();
  if (!search) return true;

  return [
    inspiration.title,
    inspiration.description,
    inspiration.organizationId,
    inspiration.category,
  ].some((value) =>
    String(value ?? "")
      .toLowerCase()
      .includes(search),
  );
}

function normalizeReviewStatus(status: unknown): ReviewStatus | undefined {
  return REVIEW_STATUS_SET.has(String(status))
    ? (status as ReviewStatus)
    : undefined;
}

function sortInspirationsForReview<T extends InspirationItem>(items: T[]) {
  return items.slice().sort((a, b) => {
    const rank = getReviewRank(a.adminReview) - getReviewRank(b.adminReview);

    return rank !== 0 ? rank : b.createdAt - a.createdAt;
  });
}

function getReviewRank(status: string) {
  const review = normalizeReviewStatus(status);
  return review ? REVIEW_RANK[review] : 99;
}

function getReviewListKey(search: string, review: ReviewStatus | undefined) {
  return `${search.trim()}::${review ?? "all"}`;
}

function removeRecordKey(record: Record<string, string>, key: string) {
  if (!(key in record)) return record;

  const { [key]: _removed, ...next } = record;
  return next;
}

function AdminInspirationsRoute() {
  const search = useSearch({ from: "/admin/inspirations/" });
  const navigate = useNavigate({ from: "/admin/inspirations/" });
  const inspirations = useQuery(api.admin.queries.listInspirations, {
    search: search.search.trim() ? search.search : undefined,
    review: search.review,
  });
  const setReviewStatus = useInspirationReviewMutation();
  const currentListKey = useMemo(
    () => getReviewListKey(search.search, search.review),
    [search.review, search.search],
  );
  const [pendingReviewIds, setPendingReviewIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [dismissedReviewKeys, setDismissedReviewKeys] = useState<
    Record<string, string>
  >({});
  const [updating, setUpdating] = useState<{
    id: string;
    status: ReviewStatus;
  } | null>(null);
  const visibleInspirations = useMemo(
    () =>
      inspirations?.filter(
        (inspiration) =>
          !pendingReviewIds.has(inspiration.id) &&
          dismissedReviewKeys[inspiration.id] !== currentListKey,
      ) ?? [],
    [currentListKey, dismissedReviewKeys, inspirations, pendingReviewIds],
  );

  const handleReview = async (inspirationId: string, status: ReviewStatus) => {
    setUpdating({ id: inspirationId, status });
    setPendingReviewIds((previous) => new Set(previous).add(inspirationId));
    setDismissedReviewKeys((previous) => ({
      ...previous,
      [inspirationId]: currentListKey,
    }));
    try {
      await setReviewStatus({
        inspirationId: inspirationId as Id<"inspirations">,
        status,
      });
      toast.success("Review updated");
    } catch {
      setDismissedReviewKeys((previous) =>
        removeRecordKey(previous, inspirationId),
      );
      toast.error("Failed to update review");
    } finally {
      setPendingReviewIds((previous) => {
        const next = new Set(previous);
        next.delete(inspirationId);
        return next;
      });
      setUpdating(null);
    }
  };

  return (
    <Layout size="lg">
      <LayoutContent>
        <div className="flex flex-col gap-8">
          <AdminPageHeader
            title="Review inspirations"
            description="Approve, star, or hide public inspiration references from one queue."
          />

          <FilterRow
            search={search.search}
            review={search.review}
            onSearchChange={(value) =>
              void navigate({ search: (prev) => ({ ...prev, search: value }) })
            }
            onReviewChange={(value) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  review: value === "all" ? undefined : value,
                }),
              })
            }
          />

          {inspirations === undefined ? (
            <AdminInspirationGridSkeleton />
          ) : visibleInspirations.length === 0 ? (
            <EmptyState
              hasFilters={Boolean(search.search || search.review)}
              onClear={() =>
                void navigate({
                  search: () => ({ search: "", review: undefined }),
                })
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleInspirations.map((inspiration) => (
                <InspirationTile
                  key={inspiration.id}
                  inspiration={inspiration}
                  updatingStatus={
                    updating?.id === inspiration.id ? updating.status : null
                  }
                  onReview={(status) =>
                    void handleReview(inspiration.id, status)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </LayoutContent>
    </Layout>
  );
}

function FilterRow(props: {
  search: string;
  review: ReviewStatus | undefined;
  onSearchChange: (value: string) => void;
  onReviewChange: (value: "all" | ReviewStatus) => void;
}) {
  return (
    <div className="border-border/60 flex flex-wrap items-center gap-3 border-y py-3">
      <div className="relative max-w-sm flex-1">
        <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          value={props.search}
          onChange={(event) => props.onSearchChange(event.target.value)}
          placeholder="Search title, description, category, or org"
          className="placeholder:text-muted-foreground focus-visible:ring-ring/40 h-10 w-full rounded-md bg-transparent pr-3 pl-9 text-sm outline-none focus-visible:ring-2"
        />
      </div>
      <Select
        value={props.review ?? "all"}
        onValueChange={props.onReviewChange}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Review" />
        </SelectTrigger>
        <SelectContent>
          {REVIEW_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InspirationTile(props: {
  inspiration: InspirationItem;
  updatingStatus: ReviewStatus | null;
  onReview: (status: ReviewStatus) => void;
}) {
  const { inspiration } = props;
  const imageUrl = inspiration.images?.[0]?.url ?? inspiration.image.url;
  const isUpdating = props.updatingStatus !== null;
  return (
    <article className="group min-w-0">
      <div className="bg-muted/60 relative aspect-video overflow-hidden rounded-lg">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={inspiration.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn(
              "size-full object-cover transition duration-200",
              inspiration.adminReview === "DENY" && "grayscale",
            )}
          />
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
            <ImageOff className="size-6" />
            <span className="text-xs">No image</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          <ReviewBadge status={inspiration.adminReview} />
          {!inspiration.isPublic || inspiration.adminReview === "DENY" ? (
            <span className="rounded-full bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium text-white uppercase">
              Hidden
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm leading-snug font-medium">
            {inspiration.title}
          </p>
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {inspiration.category ? <span>{inspiration.category}</span> : null}
            {inspiration.category ? <span aria-hidden="true">·</span> : null}
            <span>{dayjs(inspiration.createdAt).fromNow()}</span>
          </div>
        </div>

        <p className="text-muted-foreground line-clamp-2 text-xs leading-relaxed">
          {inspiration.description ?? "No description"}
        </p>

        <div className="flex items-center gap-1.5">
          {REVIEW_ACTIONS.map((action) => {
            const Icon = action.icon;
            const active = inspiration.adminReview === action.status;
            return (
              <Tooltip key={action.status} delayDuration={250}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={active ? "default" : "outline"}
                    className={cn(
                      "size-8",
                      active &&
                        action.status === "GOOD" &&
                        "bg-amber-500 text-white hover:bg-amber-600",
                    )}
                    disabled={isUpdating || active}
                    onClick={() => props.onReview(action.status)}
                    aria-label={action.label}
                  >
                    {props.updatingStatus === action.status ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Icon
                        className={cn(
                          "size-3.5",
                          active && action.status === "GOOD" && "fill-current",
                        )}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{action.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function ReviewBadge(props: { status: string }) {
  const className =
    props.status === "GOOD"
      ? "bg-amber-500 text-white"
      : props.status === "APPROVED"
        ? "bg-emerald-600 text-white"
        : props.status === "DENY"
          ? "bg-destructive text-destructive-foreground"
          : "bg-background/90 text-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase shadow-sm",
        className,
      )}
    >
      {props.status === "GOOD" ? "Starred" : props.status.toLowerCase()}
    </span>
  );
}

function EmptyState(props: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <SearchIcon className="size-5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-base font-medium">
          {props.hasFilters ? "No matches" : "No inspirations to review"}
        </p>
        <p className="text-muted-foreground max-w-xs text-sm">
          {props.hasFilters
            ? "Try a different search term or clear the filters."
            : "New references will appear here as users add them."}
        </p>
      </div>
      {props.hasFilters ? (
        <Button variant="outline" size="sm" onClick={props.onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
